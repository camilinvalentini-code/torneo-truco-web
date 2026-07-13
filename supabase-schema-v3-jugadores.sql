-- MIGRACIÓN v3: ubicación estructurada + jugadores individuales.
-- Ejecutar en Supabase → SQL Editor → New query → pegar todo → Run.
-- No borra nada de lo que ya tenés; solo agrega.

create extension if not exists "unaccent";
create extension if not exists "pg_trgm";
create extension if not exists "pgcrypto";

-- 1) Ubicación estructurada en torneos ----------------------------------
alter table tournaments add column if not exists pais text default 'AR';
alter table tournaments add column if not exists provincia text;
alter table tournaments add column if not exists ciudad text;
alter table tournaments add column if not exists lugar text;
-- "ubicacion" (el campo viejo de texto libre) queda de respaldo para los
-- torneos ya creados, pero los nuevos van a usar estos 4 campos.

-- 2) Jugadores como registros propios ------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_norm text not null, -- nombre en minúsculas y sin tildes, para buscar/matchear
  created_at timestamptz not null default now()
);
create index if not exists players_name_norm_idx on players using gin (name_norm gin_trgm_ops);

create table if not exists team_players (
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  primary key (team_id, player_id)
);

alter table players enable row level security;
alter table team_players enable row level security;

drop policy if exists "lectura publica players" on players;
drop policy if exists "lectura publica team_players" on team_players;
create policy "lectura publica players" on players for select using (true);
create policy "lectura publica team_players" on team_players for select using (true);

drop policy if exists "dueño o admin crea players" on players;
create policy "dueño o admin crea players" on players for insert with check (true);
-- (players en sí no tiene tournament_id, así que se permite crear libremente;
--  lo que sí se protege es poder ENLAZARLOS a un equipo, abajo)

drop policy if exists "dueño o admin enlaza team_players" on team_players;
create policy "dueño o admin enlaza team_players" on team_players for insert
  with check (exists (
    select 1 from teams tm join tournaments t on t.id = tm.tournament_id
    where tm.id = team_id and (t.organizador_id = auth.uid() or public.is_admin())
  ));
drop policy if exists "dueño o admin desenlaza team_players" on team_players;
create policy "dueño o admin desenlaza team_players" on team_players for delete
  using (exists (
    select 1 from teams tm join tournaments t on t.id = tm.tournament_id
    where tm.id = team_id and (t.organizador_id = auth.uid() or public.is_admin())
  ));

-- Buscar jugadores existentes por nombre parecido (para el autocompletado).
-- normaliza tildes/mayúsculas de los dos lados antes de comparar.
create or replace function public.buscar_jugadores(q text)
returns setof players language sql stable
set search_path = public, pg_temp as $$
  select * from players
  where name_norm ilike '%' || lower(unaccent(q)) || '%'
  order by name_norm
  limit 8;
$$;
grant execute on function public.buscar_jugadores(text) to anon, authenticated;

-- Fusionar dos jugadores duplicados en uno (solo Admin la va a usar desde
-- el panel). Mueve todos los equipos del "duplicado" al "bueno" y borra el duplicado.
create or replace function public.fusionar_jugadores(id_bueno uuid, id_duplicado uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'solo el admin puede fusionar jugadores';
  end if;
  insert into team_players (team_id, player_id)
  select team_id, id_bueno from team_players where player_id = id_duplicado
  on conflict do nothing;
  delete from team_players where player_id = id_duplicado;
  delete from players where id = id_duplicado;
end;
$$;
grant execute on function public.fusionar_jugadores(uuid, uuid) to authenticated;
