-- Corrige lo que encontró el Security Advisor de Supabase.

-- 1) "colocar_perdedor_vidon" ahora exige ser el dueño del torneo (o
--    admin) cuando quien llama está logueado — igual criterio que el
--    resto de las funciones. El camino sin login (disparado internamente
--    desde declarar_ganador) sigue funcionando igual, sin verse afectado.
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
  limit 1;

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

-- 2) Reaplica el fix de "players" que se había deshecho al re-correr una
--    migración vieja.
drop policy if exists "dueño o admin crea players" on players;
create policy "dueño o admin crea players" on players for insert
  with check (auth.uid() is not null);

-- 3) Cierra el permiso por default de Postgres en estas dos, de yapa
--    (tienen su propia protección interna, pero no cuesta nada cerrarlas).
revoke execute on function public.fusionar_jugadores(uuid, uuid) from anon;
revoke execute on function public.fusionar_jugadores(uuid, uuid) from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.handle_new_user() from public;
