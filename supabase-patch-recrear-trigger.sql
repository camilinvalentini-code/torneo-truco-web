-- No se puede "activar" un gatillo existente en auth.users directo
-- (esa tabla la maneja Supabase internamente). En cambio, lo recreamos
-- de cero — uno recién creado arranca activado siempre.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
