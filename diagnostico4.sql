-- Te devuelve directamente true/false, sin caracteres confusos.
select tgenabled = 'O' as esta_activado
from pg_trigger
where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created';
