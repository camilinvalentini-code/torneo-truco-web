-- Corrige una carrera real: si se fuerzan varios resultados muy rápido,
-- dos "búsquedas del primer casillero vacío" podían pisarse. El "for
-- update" bloquea esa fila hasta que la operación anterior termina de
-- guardar, así la siguiente ve el estado ya actualizado.
create or replace function public.colocar_perdedor_vidon(p_tournament_id uuid, p_match_id_recien_jugado uuid, p_loser_id uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  destino matches%rowtype;
begin
  if auth.uid() is not null and not (
    public.is_admin() or exists (select 1 from tournaments t where t.id = p_tournament_id and t.organizador_id = auth.uid())
  ) then
    raise exception 'no autorizado';
  end if;

  select * into destino from matches
  where tournament_id = p_tournament_id and bracket = 'main' and round_index = 0
    and id <> p_match_id_recien_jugado
    and (team1_id is null or team2_id is null)
  order by match_index
  limit 1
  for update;

  if not found then
    return;
  end if;

  if destino.team1_id is null then
    update matches set team1_id = p_loser_id where id = destino.id;
  else
    update matches set team2_id = p_loser_id where id = destino.id;
  end if;
end;
$$;
revoke execute on function public.colocar_perdedor_vidon(uuid, uuid, uuid) from anon;
revoke execute on function public.colocar_perdedor_vidon(uuid, uuid, uuid) from public;
grant execute on function public.colocar_perdedor_vidon(uuid, uuid, uuid) to authenticated;
