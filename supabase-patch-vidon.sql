-- MIGRACIÓN: modo de torneo "Vidon Bar" (relleno en vivo).
-- Ejecutar en Supabase → SQL Editor → New query → pegar todo → Run.
-- No toca nada del modo actual ("directa") — los torneos que ya existen
-- siguen funcionando exactamente igual.

-- 1) El torneo ahora sabe en qué modo está ------------------------------
alter table tournaments add column if not exists modo text not null default 'directa';
alter table tournaments drop constraint if exists tournaments_modo_check;
alter table tournaments add constraint tournaments_modo_check check (modo in ('directa', 'vidon'));

-- 2) Arma el cuadro en modo Vidon: parejas completas + como mucho UNA
--    "espera rival" + el resto de los casilleros del todo vacíos.
create or replace function public.generar_bracket_vidon(
  p_tournament_id uuid, p_team_ids uuid[]
) returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare
  n int := array_length(p_team_ids, 1);
  size int := 2;
  num_matches0 int;
  shuffled uuid[];
  idx int := 1;
  i int;
  r int;
  num_rounds int;
  rows_this_round int;
  t1 uuid; t2 uuid;
begin
  if auth.uid() is not null and not (
    public.is_admin() or exists (select 1 from tournaments t where t.id = p_tournament_id and t.organizador_id = auth.uid())
  ) then
    raise exception 'no autorizado';
  end if;

  while size < n loop size := size * 2; end loop;
  num_matches0 := size / 2;

  select array_agg(x order by random()) into shuffled from unnest(p_team_ids) x;

  -- parejas completas primero, tantas como alcancen
  for i in 1..num_matches0 loop
    if idx <= n - 1 then
      t1 := shuffled[idx]; t2 := shuffled[idx + 1]; idx := idx + 2;
    elsif idx <= n then
      t1 := shuffled[idx]; t2 := null; idx := idx + 1; -- la única "espera rival"
    else
      t1 := null; t2 := null; -- casillero del todo vacío, se llena en vivo
    end if;
    insert into matches (tournament_id, bracket, round_index, match_index, team1_id, team2_id, winner_id, bye, match_token)
    values (p_tournament_id, 'main', 0, i - 1, t1, t2, null, false, encode(gen_random_bytes(8), 'hex'));
  end loop;

  num_rounds := 0;
  while (size >> num_rounds) > 1 loop num_rounds := num_rounds + 1; end loop;

  for r in 1..num_rounds - 1 loop
    rows_this_round := size / power(2, r + 1);
    for i in 0..rows_this_round - 1 loop
      insert into matches (tournament_id, bracket, round_index, match_index, team1_id, team2_id, bye, match_token)
      values (p_tournament_id, 'main', r, i, null, null, false, encode(gen_random_bytes(8), 'hex'));
    end loop;
  end loop;
end;
$$;
grant execute on function public.generar_bracket_vidon(uuid, uuid[]) to authenticated;
revoke execute on function public.generar_bracket_vidon(uuid, uuid[]) from anon;
revoke execute on function public.generar_bracket_vidon(uuid, uuid[]) from public;

-- 3) Coloca a un perdedor de la ronda 0 (modo Vidon) en el primer
--    casillero vacío que encuentre, en orden. Si no queda ninguno, el
--    perdedor simplemente queda eliminado (no hace falta hacer nada más).
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
    return; -- no queda ningún casillero libre: el perdedor queda eliminado
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

-- 4) El organizador puede sacar a un equipo de un casillero ya colocado
--    en la ronda 0 (modo Vidon) si todavía no jugó ese partido puntual,
--    liberando el lugar para que lo tome el próximo perdedor que llegue.
create or replace function public.quitar_de_casillero_vidon(p_match_id uuid, p_team_id uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where id = p_match_id;
  if not found or m.winner_id is not null then
    raise exception 'ese partido ya se jugó, no se puede editar';
  end if;

  if auth.uid() is not null and not (
    public.is_admin() or exists (select 1 from tournaments t where t.id = m.tournament_id and t.organizador_id = auth.uid())
  ) then
    raise exception 'no autorizado';
  end if;

  if m.team1_id = p_team_id then
    update matches set team1_id = null where id = p_match_id;
  elsif m.team2_id = p_team_id then
    update matches set team2_id = null where id = p_match_id;
  end if;
end;
$$;
grant execute on function public.quitar_de_casillero_vidon(uuid, uuid) to authenticated;
revoke execute on function public.quitar_de_casillero_vidon(uuid, uuid) from anon;
revoke execute on function public.quitar_de_casillero_vidon(uuid, uuid) from public;

-- 5) "declarar_ganador" ahora, cuando el torneo es modo Vidon y el
--    partido decidido es de la ronda 0, además llama a la función de
--    arriba para intentar colocar al perdedor en un casillero vacío.
create or replace function public.declarar_ganador(p_match_id uuid, p_winner_id uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
  max_round int;
  next_idx int;
  round0_done boolean;
  t_repechaje boolean;
  t_modo text;
  existing_rep int;
  losers uuid[];
  loser_id uuid;
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

  select modo into t_modo from tournaments where id = m.tournament_id;

  -- Modo Vidon: el perdedor de la ronda 0 busca casillero vacío en vez
  -- de quedar directo en la llave de repechaje.
  if t_modo = 'vidon' and m.bracket = 'main' and m.round_index = 0 then
    loser_id := case when p_winner_id = m.team1_id then m.team2_id else m.team1_id end;
    perform public.colocar_perdedor_vidon(m.tournament_id, m.id, loser_id);
  end if;

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

  -- El repechaje de siempre (llave separada) sigue existiendo, pero
  -- solo para el modo "directa" — en modo Vidon no aplica, el relleno
  -- ya pasó arriba.
  if t_modo = 'directa' and m.bracket = 'main' and m.round_index = 0 then
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
grant execute on function public.declarar_ganador(uuid, uuid) to authenticated;
revoke execute on function public.declarar_ganador(uuid, uuid) from anon;
revoke execute on function public.declarar_ganador(uuid, uuid) from public;
