-- Corrige el link corto (/t/tu-nombre): ahora ignora los torneos
-- cerrados a mano (sin campeón) cuando busca "tu torneo actual".
create or replace function public.torneo_por_slug(p_slug text)
returns uuid language plpgsql security definer stable
set search_path = public, pg_temp as $$
declare
  organizador uuid;
  torneo_id uuid;
begin
  select id into organizador from profiles where slug = p_slug;
  if organizador is null then return null; end if;

  select id into torneo_id from tournaments
  where organizador_id = organizador and started = true and champion_id is null and cerrado = false
  order by created_at desc limit 1;
  if torneo_id is not null then return torneo_id; end if;

  select id into torneo_id from tournaments
  where organizador_id = organizador
  order by created_at desc limit 1;
  return torneo_id;
end;
$$;
grant execute on function public.torneo_por_slug(text) to anon, authenticated;
