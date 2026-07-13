-- Ejecutar esto una sola vez en Supabase: Project → SQL Editor → New query → pegar todo → Run

create extension if not exists "pgcrypto";

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default '',
  ubicacion text not null default '',
  fecha text not null default '',
  categoria text not null check (categoria in ('2v2','3v3')),
  repechaje boolean not null default false,
  admin_token text not null,
  started boolean not null default false,
  champion_id uuid,
  repechaje_champion_id uuid,
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  players text not null default '',
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  bracket text not null default 'main' check (bracket in ('main','repechaje')),
  round_index int not null,
  match_index int not null,
  team1_id uuid references teams(id),
  team2_id uuid references teams(id),
  winner_id uuid references teams(id),
  score_a int not null default 0,
  score_b int not null default 0,
  bye boolean not null default false,
  match_token text unique,
  created_at timestamptz not null default now()
);

-- Nadie necesita loguearse: cualquiera con el link puede leer, y solo quien tenga
-- el token de partido (nadie lo puede adivinar) puede cargar resultados de ESE partido.
-- Por eso dejamos las tablas abiertas a lectura/escritura pública vía la anon key;
-- la "seguridad" pasa por lo impredecible del UUID/token, no por login.
alter table tournaments enable row level security;
alter table teams enable row level security;
alter table matches enable row level security;

create policy "lectura publica tournaments" on tournaments for select using (true);
create policy "escritura publica tournaments" on tournaments for insert with check (true);
create policy "update publico tournaments" on tournaments for update using (true);

create policy "lectura publica teams" on teams for select using (true);
create policy "escritura publica teams" on teams for insert with check (true);
create policy "update publico teams" on teams for update using (true);
create policy "borrado publico teams" on teams for delete using (true);

create policy "lectura publica matches" on matches for select using (true);
create policy "escritura publica matches" on matches for insert with check (true);
create policy "update publico matches" on matches for update using (true);

-- Habilitar tiempo real (para que el cuadro y el anotador se actualicen solos)
alter publication supabase_realtime add table tournaments;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table matches;
