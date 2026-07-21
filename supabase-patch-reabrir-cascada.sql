-- Reabrir un partido, en cascada: si su resultado ya se usó para jugar
-- partidos más adelante (cuartos, semi, final...), esos también se
-- deshacen automáticamente, en orden, hasta el final del cuadro.
--
-- OJO — alcance de esta función: solo deshace el camino normal de
-- "el ganador avanza a la siguiente ronda". En el Sistema Vidon Bar,
-- el PERDEDOR de la ronda 0 puede haber ocupado un lugar vacío y seguir
-- jugando por ese lado — esa parte no se deshace sola, habría que
-- revisarla a mano si corresponde.
create or replace function public.reabrir_cascada(p_match_id uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
  max_round int;
  next_idx int;
  siguiente matches%rowtype;
begin
  select * into m from matches where id = p_match_id;
  if not found then return; end if;

  if auth.uid() is not null and not (
    public.is_admin() or exists (select 1 from tournaments t where t.id = m.tournament_id and t.organizador_id = auth.uid())
  ) then
    raise exception 'no autorizado';
  end if;

  if m.winner_id is null then return; end if; -- no había nada que reabrir

  select max(round_index) into max_round from matches where tournament_id = m.tournament_id and bracket = m.bracket;

  if m.round_index = max_round then
    if m.bracket = 'main' then
      update tournaments set champion_id = null where id = m.tournament_id;
    else
      update tournaments set repechaje_champion_id = null where id = m.tournament_id;
    end if;
  else
    next_idx := m.match_index / 2;
    select * into siguiente from matches
      where tournament_id = m.tournament_id and bracket = m.bracket and round_index = m.round_index + 1 and match_index = next_idx;

    if found and siguiente.winner_id is not null then
      -- ese partido ya se jugó con un resultado que ahora queda inválido:
      -- lo reabrimos primero a él (y esto se repite en cascada solo).
      perform public.reabrir_cascada(siguiente.id);
    end if;

    if found then
      if m.match_index % 2 = 0 then
        update matches set team1_id = null where id = siguiente.id;
      else
        update matches set team2_id = null where id = siguiente.id;
      end if;
    end if;
  end if;

  update matches set winner_id = null where id = m.id;
end;
$$;
grant execute on function public.reabrir_cascada(uuid) to authenticated;
revoke execute on function public.reabrir_cascada(uuid) from anon;
revoke execute on function public.reabrir_cascada(uuid) from public;
