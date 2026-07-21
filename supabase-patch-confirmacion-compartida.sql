-- Antes, el cartel de "¿confirmás que ganó?" era una ventanita del
-- navegador (window.confirm), que solo la ve el celular donde se tocó
-- el punto. Esto lo cambia por un aviso que vive en la base de datos, y
-- que por eso los dos celus que están mirando el mismo partido ven a la
-- vez (ya usan tiempo real) — cualquiera de los dos puede confirmar.

alter table matches add column if not exists confirmacion_pendiente boolean not null default false;
alter table matches add column if not exists lado_propuesto text;

-- En vez de sumar el punto de una, cuando ese punto llegaría al tope,
-- solo "propone" el cierre. El puntaje todavía no cambia.
create or replace function public.proponer_cierre(p_match_token text, p_lado text)
returns matches language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then raise exception 'partido no encontrado'; end if;
  if m.winner_id is not null then return m; end if;
  update matches set confirmacion_pendiente = true, lado_propuesto = p_lado where id = m.id;
  select * into m from matches where id = m.id;
  return m;
end;
$$;
grant execute on function public.proponer_cierre(text, text) to anon, authenticated;

-- Cualquiera de los dos celus puede cancelar la propuesta (no pasó nada,
-- el puntaje sigue como estaba).
create or replace function public.cancelar_cierre(p_match_token text)
returns matches language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then raise exception 'partido no encontrado'; end if;
  update matches set confirmacion_pendiente = false, lado_propuesto = null where id = m.id;
  select * into m from matches where id = m.id;
  return m;
end;
$$;
grant execute on function public.cancelar_cierre(text) to anon, authenticated;

-- Cualquiera de los dos celus puede confirmar — ahí sí se suma el punto
-- de verdad, se cierra el partido y avanza de fase.
create or replace function public.confirmar_cierre(p_match_token text)
returns matches language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
  tope int;
  ganador uuid;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then raise exception 'partido no encontrado'; end if;
  if m.winner_id is not null then return m; end if;
  if not m.confirmacion_pendiente then return m; end if;

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
grant execute on function public.confirmar_cierre(text) to anon, authenticated;
