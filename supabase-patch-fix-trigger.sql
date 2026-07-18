-- Revierte el exceso de celo de la query 12: esta función es un gatillo
-- (trigger) que Supabase dispara solo al registrarse alguien nuevo, no
-- algo pensado para llamarse directo. Restringirle el acceso rompió la
-- creación automática de perfiles nuevos.
grant execute on function public.handle_new_user() to public;
