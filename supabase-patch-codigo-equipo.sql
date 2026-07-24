-- Código secreto por equipo, para que solo los dos equipos que juegan un
-- partido puedan tocar los botones del anotador (nadie más, aunque tenga
-- el link). El código es fijo para todo el torneo (uno por equipo, se
-- genera solo al crear el equipo) y sirve para CUALQUIERA de sus
-- partidos. Ver el marcador sigue siendo libre para cualquiera — el
-- código solo hace falta para anotar puntos o confirmar/cancelar un
-- cierre de partido.

alter table teams add column if not exists codigo text;

-- Genera un código de 4 dígitos que no choque con otro código ya usado
-- dentro del mismo torneo.
create or replace function public.generar_codigo_equipo(p_tournament_id uuid)
returns text language plpgsql as $$
declare
  nuevo text;
  intentos int := 0;
begin
  loop
    nuevo := lpad(floor(random() * 10000)::int::text, 4, '0');
    intentos := intentos + 1;
    exit when intentos > 30 or not exists (
      select 1 from teams where tournament_id = p_tournament_id and codigo = nuevo
    );
  end loop;
  return nuevo;
end;
$$;

-- Al crear un equipo nuevo, si no le pasaron código de una, se le genera
-- automáticamente. Así ningún lugar del código de la app tiene que
-- acordarse de generarlo a mano.
create or replace function public.trg_set_codigo_equipo()
returns trigger language plpgsql as $$
begin
  if new.codigo is null then
    new.codigo := public.generar_codigo_equipo(new.tournament_id);
  end if;
  return new;
end;
$$;

drop trigger if exists set_codigo_equipo on teams;
create trigger set_codigo_equipo
before insert on teams
for each row execute function public.trg_set_codigo_equipo();

-- Backfill: a los equipos que ya existían antes de este patch, generarles
-- código también.
do $$
declare
  r record;
begin
  for r in select id, tournament_id from teams where codigo is null loop
    update teams set codigo = public.generar_codigo_equipo(r.tournament_id) where id = r.id;
  end loop;
end $$;

-- Helper interno: ¿el código dado sirve para ESTE partido puntual? (es el
-- código del equipo 1 o del equipo 2 de ese partido). No se le da permiso
-- de ejecución a anon: solo lo llaman por dentro las funciones de abajo.
create or replace function public.codigo_valido(p_match_id uuid, p_codigo text)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
  c1 text;
  c2 text;
begin
  if p_codigo is null or length(trim(p_codigo)) = 0 then return false; end if;
  select * into m from matches where id = p_match_id;
  if not found then return false; end if;
  select codigo into c1 from teams where id = m.team1_id;
  select codigo into c2 from teams where id = m.team2_id;
  return p_codigo = c1 or p_codigo = c2;
end;
$$;

-- Esta sí se expone: la usa la pantalla del anotador para validar el
-- código que escribió la persona, sin revelar el código real de nadie
-- (solo contesta true/false).
create or replace function public.validar_codigo_equipo(p_match_token text, p_codigo text)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then return false; end if;
  return public.codigo_valido(m.id, p_codigo);
end;
$$;
grant execute on function public.validar_codigo_equipo(text, text) to anon, authenticated;

-- A partir de acá, las 4 funciones que ya existían, ahora piden código.
-- Se borran las versiones viejas (sin código) para que no quede ninguna
-- forma de anotar sin pasar por la validación.

drop function if exists public.anotar_punto(text, text, int);
create or replace function public.anotar_punto(p_match_token text, p_lado text, p_delta int, p_codigo text)
returns matches language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
  nuevo int;
  tope int;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then raise exception 'partido no encontrado'; end if;
  if not public.codigo_valido(m.id, p_codigo) then raise exception 'código inválido'; end if;
  if m.winner_id is not null then return m; end if;

  select puntos_max into tope from tournaments where id = m.tournament_id;
  tope := coalesce(tope, 30);

  if p_lado = 'A' then
    nuevo := greatest(0, least(tope, m.score_a + p_delta));
    update matches set score_a = nuevo where id = m.id;
  else
    nuevo := greatest(0, least(tope, m.score_b + p_delta));
    update matches set score_b = nuevo where id = m.id;
  end if;

  if nuevo >= tope then
    perform public.declarar_ganador(m.id, case when p_lado = 'A' then m.team1_id else m.team2_id end);
  end if;

  select * into m from matches where id = m.id;
  return m;
end;
$$;
grant execute on function public.anotar_punto(text, text, int, text) to anon, authenticated;

drop function if exists public.proponer_cierre(text, text);
create or replace function public.proponer_cierre(p_match_token text, p_lado text, p_codigo text)
returns matches language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then raise exception 'partido no encontrado'; end if;
  if not public.codigo_valido(m.id, p_codigo) then raise exception 'código inválido'; end if;
  if m.winner_id is not null then return m; end if;
  update matches set confirmacion_pendiente = true, lado_propuesto = p_lado, confirmaciones = 1 where id = m.id;
  select * into m from matches where id = m.id;
  return m;
end;
$$;
grant execute on function public.proponer_cierre(text, text, text) to anon, authenticated;

drop function if exists public.cancelar_cierre(text);
create or replace function public.cancelar_cierre(p_match_token text, p_codigo text)
returns matches language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then raise exception 'partido no encontrado'; end if;
  if not public.codigo_valido(m.id, p_codigo) then raise exception 'código inválido'; end if;
  update matches set confirmacion_pendiente = false, lado_propuesto = null, confirmaciones = 0 where id = m.id;
  select * into m from matches where id = m.id;
  return m;
end;
$$;
grant execute on function public.cancelar_cierre(text, text) to anon, authenticated;

drop function if exists public.confirmar_cierre(text);
create or replace function public.confirmar_cierre(p_match_token text, p_codigo text)
returns matches language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
  tope int;
  ganador uuid;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then raise exception 'partido no encontrado'; end if;
  if not public.codigo_valido(m.id, p_codigo) then raise exception 'código inválido'; end if;
  if m.winner_id is not null then return m; end if;
  if not m.confirmacion_pendiente then return m; end if;

  update matches set confirmaciones = confirmaciones + 1 where id = m.id;
  select * into m from matches where id = m.id;

  if m.confirmaciones < 2 then
    return m; -- todavía falta la otra confirmación
  end if;

  select puntos_max into tope from tournaments where id = m.tournament_id;
  tope := coalesce(tope, 30);

  if m.lado_propuesto = 'A' then
    update matches set score_a = tope, confirmacion_pendiente = false, lado_propuesto = null where id = m.id;
    ganador := m.team1_id;
  else
    update matches set score_b = tope, confirmacion_pendiente = false, lado_propuesto = null where id = m.id;
    ganador := m.team2_id;
  end if;

  perform public.declarar_ganador(m.id, ganador);

  select * into m from matches where id = m.id;
  return m;
end;
$$;
grant execute on function public.confirmar_cierre(text, text) to anon, authenticated;
