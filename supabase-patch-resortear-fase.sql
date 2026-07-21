-- El "Resortear" que ya tenías solo sirve para la ronda 0 (antes de
-- sortear nada). Esta función es distinta: re-sortea una FASE que ya
-- está completa (todos sus cruces definidos) pero todavía nadie jugó
-- nada ahí — por ejemplo, Octavos apenas termina Dieciseisavos, antes
-- de que arranque el primer partido de Octavos.
create or replace function public.resortear_fase(p_tournament_id uuid, p_bracket text, p_round_index int)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  ids uuid[];
  shuffled uuid[];
  m record;
  idx int := 1;
begin
  if auth.uid() is not null and not (
    public.is_admin() or exists (select 1 from tournaments t where t.id = p_tournament_id and t.organizador_id = auth.uid())
  ) then
    raise exception 'no autorizado';
  end if;

  if exists (
    select 1 from matches
    where tournament_id = p_tournament_id and bracket = p_bracket and round_index = p_round_index
      and (team1_id is null or team2_id is null)
  ) then
    raise exception 'todavía no están definidos todos los cruces de esta fase';
  end if;

  if exists (
    select 1 from matches
    where tournament_id = p_tournament_id and bracket = p_bracket and round_index = p_round_index
      and (winner_id is not null or score_a > 0 or score_b > 0)
  ) then
    raise exception 'ya se jugó algo en esta fase, no se puede resortear';
  end if;

  select array_agg(x order by random()) into shuffled from (
    select team1_id as x from matches where tournament_id = p_tournament_id and bracket = p_bracket and round_index = p_round_index
    union all
    select team2_id from matches where tournament_id = p_tournament_id and bracket = p_bracket and round_index = p_round_index
  ) s;

  for m in
    select id from matches
    where tournament_id = p_tournament_id and bracket = p_bracket and round_index = p_round_index
    order by match_index
  loop
    update matches set team1_id = shuffled[idx], team2_id = shuffled[idx + 1], avisado = false, avisado_espera = false where id = m.id;
    idx := idx + 2;
  end loop;
end;
$$;
grant execute on function public.resortear_fase(uuid, text, int) to authenticated;
revoke execute on function public.resortear_fase(uuid, text, int) from anon;
revoke execute on function public.resortear_fase(uuid, text, int) from public;
