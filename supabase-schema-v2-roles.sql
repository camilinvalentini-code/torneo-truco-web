-- MIGRACIÓN v2: cuentas reales para Organizador/Admin.
-- Ejecutar en Supabase → SQL Editor → New query → pegar todo → Run.
-- Es seguro correrlo sobre la base que ya tenés armada (no borra tus torneos de prueba).

create extension if not exists "pgcrypto";

-- 1) Perfiles -----------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text not null default '',
  role text not null default 'organizador' check (role in ('admin','organizador')),
  status text not null default 'pendiente' check (status in ('pendiente','aprobado','rechazado')),
  created_at timestamptz not null default now()
);

-- Se crea el perfil solo, apenas alguien pide el código por primera vez.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Función auxiliar: ¿el usuario logueado es admin aprobado? (evita recursión en RLS)
create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'aprobado'
  );
$$;

alter table profiles enable row level security;
drop policy if exists "ver perfil propio o admin" on profiles;
drop policy if exists "actualizar perfil solo admin" on profiles;
create policy "ver perfil propio o admin" on profiles for select
  using (auth.uid() = id or public.is_admin());
create policy "actualizar perfil solo admin" on profiles for update
  using (public.is_admin());

-- 2) Torneos ligados a un organizador -----------------------------------
alter table tournaments add column if not exists organizador_id uuid references profiles(id);
alter table tournaments alter column admin_token drop not null; -- ya no se usa, reemplazado por login real

drop policy if exists "escritura publica tournaments" on tournaments;
drop policy if exists "update publico tournaments" on tournaments;

create policy "organizador aprobado crea su torneo" on tournaments for insert
  with check (
    organizador_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status = 'aprobado')
  );
create policy "dueño o admin edita torneo" on tournaments for update
  using (organizador_id = auth.uid() or public.is_admin());
create policy "dueño o admin borra torneo" on tournaments for delete
  using (organizador_id = auth.uid() or public.is_admin());

-- 3) Equipos: solo el dueño del torneo (o admin) los gestiona -----------
drop policy if exists "escritura publica teams" on teams;
drop policy if exists "update publico teams" on teams;
drop policy if exists "borrado publico teams" on teams;

create policy "dueño o admin agrega equipos" on teams for insert
  with check (exists (
    select 1 from tournaments t where t.id = tournament_id
    and (t.organizador_id = auth.uid() or public.is_admin())
  ));
create policy "dueño o admin edita equipos" on teams for update
  using (exists (
    select 1 from tournaments t where t.id = tournament_id
    and (t.organizador_id = auth.uid() or public.is_admin())
  ));
create policy "dueño o admin borra equipos" on teams for delete
  using (exists (
    select 1 from tournaments t where t.id = tournament_id
    and (t.organizador_id = auth.uid() or public.is_admin())
  ));

-- 4) Partidos: crearlos/editarlos a mano es solo del dueño/admin --------
--    (el anotador de mesa, sin login, usa las funciones de abajo en vez
--    de tocar la tabla directamente)
drop policy if exists "escritura publica matches" on matches;
drop policy if exists "update publico matches" on matches;

create policy "dueño o admin crea partidos" on matches for insert
  with check (exists (
    select 1 from tournaments t where t.id = tournament_id
    and (t.organizador_id = auth.uid() or public.is_admin())
  ));
create policy "dueño o admin edita partidos" on matches for update
  using (exists (
    select 1 from tournaments t where t.id = tournament_id
    and (t.organizador_id = auth.uid() or public.is_admin())
  ));

-- 5) Funciones públicas seguras para el anotador de mesa (sin login) ----
-- Arma el cuadro de repechaje adentro de la base (mismo criterio que el
-- código JS: nunca empareja dos "libres" entre sí).
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
  idx int := 1;
  i int;
  r int;
  num_rounds int;
  rows_this_round int;
  t1 uuid; t2 uuid; is_bye boolean;
  next_idx int; slot text;
begin
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

  -- Propagar los "libres" de la ronda 0 a la ronda 1
  for i in 0..num_matches0 - 1 loop
    if sizes[i + 1] = 1 then
      next_idx := i / 2;
      slot := case when i % 2 = 0 then 'team1_id' else 'team2_id' end;
      if slot = 'team1_id' then
        update matches set team1_id = shuffled[i + 1]
          where tournament_id = p_tournament_id and bracket = p_bracket and round_index = 1 and match_index = next_idx;
      else
        update matches set team2_id = shuffled[i + 1]
          where tournament_id = p_tournament_id and bracket = p_bracket and round_index = 1 and match_index = next_idx;
      end if;
    end if;
  end loop;
end;
$$;

-- Declara ganador de un partido, propaga a la siguiente ronda, corona
-- campeón si era la final, y dispara el repechaje si corresponde.
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

-- La única puerta de entrada del anotador de mesa (sin login): suma o
-- resta un tanto, y si con eso se llega a 30, corona sola.
create or replace function public.anotar_punto(p_match_token text, p_lado text, p_delta int)
returns matches language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
  nuevo int;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then raise exception 'partido no encontrado'; end if;
  if m.winner_id is not null then return m; end if;

  if p_lado = 'A' then
    nuevo := greatest(0, least(30, m.score_a + p_delta));
    update matches set score_a = nuevo where id = m.id;
  else
    nuevo := greatest(0, least(30, m.score_b + p_delta));
    update matches set score_b = nuevo where id = m.id;
  end if;

  if nuevo >= 30 then
    perform public.declarar_ganador(m.id, case when p_lado = 'A' then m.team1_id else m.team2_id end);
  end if;

  select * into m from matches where id = m.id;
  return m;
end;
$$;

-- Permitir que cualquiera (incluso sin login) llame a estas 2 funciones,
-- ya que son la única forma en que un competidor sin cuenta puede jugar.
grant execute on function public.anotar_punto(text, text, int) to anon, authenticated;
grant execute on function public.declarar_ganador(uuid, uuid) to anon, authenticated;
grant execute on function public.generar_bracket(uuid, text, uuid[]) to authenticated;
