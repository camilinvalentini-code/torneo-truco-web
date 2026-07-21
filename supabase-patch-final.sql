-- PARCHE FINAL — corre esto último, y no vuelvas a correr la query vieja
-- que dice "MIGRACIÓN v2" de nuevo (esa es la que está devolviendo el
-- permiso a "anon" cada vez que se re-ejecuta). Este parche deja todo
-- bien sin importar qué se haya corrido antes.

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
create or replace function public.declarar_ganador(p_match_id uuid, p_winner_id uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
  max_round int;
  next_idx int;
  round0_done boolean;
  t_repechaje boolean;
  existing_rep int;
  losers uuid[];
begin
  select * into m from matches where id = p_match_id;
  if not found or m.winner_id is not null then return; end if;
  if p_winner_id is distinct from m.team1_id and p_winner_id is distinct from m.team2_id then
    raise exception 'ese equipo no juega este partido';
  end if;

  if auth.uid() is not null and not (
    public.is_admin() or exists (
      select 1 from tournaments t where t.id = m.tournament_id and t.organizador_id = auth.uid()
    )
  ) then
    raise exception 'no autorizado';
  end if;

  update matches set winner_id = p_winner_id where id = p_match_id;

  select max(round_index) into max_round from matches where tournament_id = m.tournament_id and bracket = m.bracket;

  if m.round_index = max_round then
    if m.bracket = 'main' then
      update tournaments set champion_id = p_winner_id where id = m.tournament_id;
    else
      update tournaments set repechaje_champion_id = p_winner_id where id = m.tournament_id;
    end if;
  else
    next_idx := m.match_index / 2;
    if m.match_index % 2 = 0 then
      update matches set team1_id = p_winner_id
        where tournament_id = m.tournament_id and bracket = m.bracket and round_index = m.round_index + 1 and match_index = next_idx;
    else
      update matches set team2_id = p_winner_id
        where tournament_id = m.tournament_id and bracket = m.bracket and round_index = m.round_index + 1 and match_index = next_idx;
    end if;
  end if;

  if m.bracket = 'main' and m.round_index = 0 then
    select bool_and(winner_id is not null) into round0_done
      from matches where tournament_id = m.tournament_id and bracket = 'main' and round_index = 0;
    if round0_done then
      select repechaje into t_repechaje from tournaments where id = m.tournament_id;
      if t_repechaje then
        select count(*) into existing_rep from matches where tournament_id = m.tournament_id and bracket = 'repechaje';
        if existing_rep = 0 then
          select array_agg(case when team1_id = winner_id then team2_id else team1_id end)
            into losers
            from matches where tournament_id = m.tournament_id and bracket = 'main' and round_index = 0 and bye = false;
          if array_length(losers, 1) >= 2 then
            perform public.generar_bracket(m.tournament_id, 'repechaje', losers);
          elsif array_length(losers, 1) = 1 then
            update tournaments set repechaje_champion_id = losers[1] where id = m.tournament_id;
          end if;
        end if;
      end if;
    end if;
  end if;
end;
$$;

revoke execute on function public.declarar_ganador(uuid, uuid) from anon;
revoke execute on function public.declarar_ganador(uuid, uuid) from public;
revoke execute on function public.generar_bracket(uuid, text, uuid[]) from anon;
revoke execute on function public.generar_bracket(uuid, text, uuid[]) from public;
grant execute on function public.declarar_ganador(uuid, uuid) to authenticated;
grant execute on function public.generar_bracket(uuid, text, uuid[]) to authenticated;
