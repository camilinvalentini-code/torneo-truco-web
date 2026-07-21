-- Ahora hacen falta 2 confirmaciones (una de cada lado) para cerrar el
-- partido de verdad, en vez de que cualquiera de los dos lo cierre solo.
-- Proponer ya cuenta como la primera confirmación (la de quien tocó el
-- punto 30) — falta 1 más de la otra mesa.

alter table matches add column if not exists confirmaciones int not null default 0;

create or replace function public.proponer_cierre(p_match_token text, p_lado text)
returns matches language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then raise exception 'partido no encontrado'; end if;
  if m.winner_id is not null then return m; end if;
  update matches set confirmacion_pendiente = true, lado_propuesto = p_lado, confirmaciones = 1 where id = m.id;
  select * into m from matches where id = m.id;
  return m;
end;
$$;
grant execute on function public.proponer_cierre(text, text) to anon, authenticated;

create or replace function public.cancelar_cierre(p_match_token text)
returns matches language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then raise exception 'partido no encontrado'; end if;
  update matches set confirmacion_pendiente = false, lado_propuesto = null, confirmaciones = 0 where id = m.id;
  select * into m from matches where id = m.id;
  return m;
end;
$$;
grant execute on function public.cancelar_cierre(text) to anon, authenticated;

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
grant execute on function public.confirmar_cierre(text) to anon, authenticated;
