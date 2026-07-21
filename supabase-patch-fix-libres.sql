-- BUG REAL encontrado: al armar el cuadro, los equipos que pasan "libres"
-- se empujaban a la siguiente ronda recalculando su posición en el mazo
-- mezclado desde cero, en vez de usar el equipo que de verdad quedó
-- anotado en ese partido. Con 2 o más libres, en ciertos órdenes, ese
-- recálculo agarraba el equipo de un partido VECINO por error.
create or replace function public.generar_bracket(
  p_tournament_id uuid, p_bracket text, p_team_ids uuid[]
) returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare
  n int := array_length(p_team_ids, 1);
  size int := 2;
  num_matches0 int;
  byes int;
  shuffled uuid[];
  sizes int[];
  team1_usado uuid[] := array[]::uuid[];
  idx int := 1;
  i int;
  r int;
  num_rounds int;
  rows_this_round int;
  t1 uuid; t2 uuid; is_bye boolean;
  next_idx int; slot text;
begin
  if auth.uid() is not null and not (
    public.is_admin() or exists (select 1 from tournaments t where t.id = p_tournament_id and t.organizador_id = auth.uid())
  ) then
    raise exception 'no autorizado';
  end if;

  while size < n loop size := size * 2; end loop;
  num_matches0 := size / 2;
  byes := size - n;

  select array_agg(x order by random()) into shuffled from unnest(p_team_ids) x;

  select array_agg(v order by random()) into sizes from (
    select 1 as v from generate_series(1, byes)
    union all
    select 2 as v from generate_series(1, num_matches0 - byes)
  ) s;

  for i in 1..num_matches0 loop
    t1 := shuffled[idx]; idx := idx + 1;
    is_bye := sizes[i] = 1;
    if is_bye then t2 := null; else t2 := shuffled[idx]; idx := idx + 1; end if;
    team1_usado := array_append(team1_usado, t1);
    insert into matches (tournament_id, bracket, round_index, match_index, team1_id, team2_id, winner_id, bye, match_token)
    values (p_tournament_id, p_bracket, 0, i - 1, t1, t2, case when is_bye then t1 else null end, is_bye,
            case when is_bye then null else encode(gen_random_bytes(8), 'hex') end);
  end loop;

  num_rounds := 0;
  while (size >> num_rounds) > 1 loop num_rounds := num_rounds + 1; end loop;

  for r in 1..num_rounds - 1 loop
    rows_this_round := size / power(2, r + 1);
    for i in 0..rows_this_round - 1 loop
      insert into matches (tournament_id, bracket, round_index, match_index, team1_id, team2_id, bye, match_token)
      values (p_tournament_id, p_bracket, r, i, null, null, false, encode(gen_random_bytes(8), 'hex'));
    end loop;
  end loop;

  -- Propagar los "libres" de la ronda 0 a la ronda 1 — usando el equipo
  -- que DE VERDAD quedó anotado en ese partido (team1_usado), no una
  -- posición recalculada a ciegas en el mazo mezclado.
  for i in 0..num_matches0 - 1 loop
    if sizes[i + 1] = 1 then
      next_idx := i / 2;
      slot := case when i % 2 = 0 then 'team1_id' else 'team2_id' end;
      if slot = 'team1_id' then
        update matches set team1_id = team1_usado[i + 1]
          where tournament_id = p_tournament_id and bracket = p_bracket and round_index = 1 and match_index = next_idx;
      else
        update matches set team2_id = team1_usado[i + 1]
          where tournament_id = p_tournament_id and bracket = p_bracket and round_index = 1 and match_index = next_idx;
      end if;
    end if;
  end loop;
end;
$$;
