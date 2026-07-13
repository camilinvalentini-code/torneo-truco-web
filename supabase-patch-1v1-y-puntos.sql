-- Habilita 1v1 como categoría de torneo, además de 2v2 y 3v3.
alter table tournaments drop constraint if exists tournaments_categoria_check;
alter table tournaments add constraint tournaments_categoria_check
  check (categoria in ('1v1', '2v2', '3v3'));

-- Habilita elegir si el tanteador de un torneo llega a 30 o a 15 puntos.
alter table tournaments add column if not exists puntos_max int not null default 30;
alter table tournaments drop constraint if exists tournaments_puntos_max_check;
alter table tournaments add constraint tournaments_puntos_max_check check (puntos_max in (15, 30));

create or replace function public.anotar_punto(p_match_token text, p_lado text, p_delta int)
returns matches language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  m matches%rowtype;
  nuevo int;
  tope int;
begin
  select * into m from matches where match_token = p_match_token;
  if not found then raise exception 'partido no encontrado'; end if;
  if m.winner_id is not null then return m; end if;

  select puntos_max into tope from tournaments where id = m.tournament_id;
  tope := coalesce(tope, 30);

  if p_lado = 'A' then
    nuevo := greatest(0, least(tope, m.score_a + p_delta));
    update matches set score_a = nuevo where id = m.id;
  else
    nuevo := greatest(0, least(tope, m.score_b + p_delta));
    update matches set score_b = nuevo where id = m.id;
  end if;

  if nuevo >= tope then
    perform public.declarar_ganador(m.id, case when p_lado = 'A' then m.team1_id else m.team2_id end);
  end if;

  select * into m from matches where id = m.id;
  return m;
end;
$$;

