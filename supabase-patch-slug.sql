-- Link corto por organizador (ej: torneotruco.com.ar/t/vidonbar).
-- Apunta siempre al torneo más reciente de ese organizador — cuando crea
-- uno nuevo, el mismo link "vidonbar" pasa a mostrar el nuevo solo.

alter table profiles add column if not exists slug text unique;
alter table profiles drop constraint if exists profiles_slug_format_check;
alter table profiles add constraint profiles_slug_format_check
  check (slug is null or slug ~ '^[a-z0-9-]{3,30}$');

-- Cada organizador puede poner SU propio slug, y solo eso — esta función
-- no permite tocar ninguna otra columna (ni role, ni status), a
-- diferencia de darle un permiso de UPDATE general sobre profiles.
create or replace function public.actualizar_mi_slug(nuevo_slug text)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'hay que estar logueado';
  end if;
  update profiles set slug = nuevo_slug where id = auth.uid();
end;
$$;
grant execute on function public.actualizar_mi_slug(text) to authenticated;
revoke execute on function public.actualizar_mi_slug(text) from anon;
revoke execute on function public.actualizar_mi_slug(text) from public;

-- Para que cualquiera (sin login) pueda resolver "/t/tu-slug" y encontrar
-- el torneo correspondiente, sin exponer el resto de tu perfil.
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
