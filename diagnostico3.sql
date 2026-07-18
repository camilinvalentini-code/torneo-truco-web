-- Solo lectura. Confirma si el gatillo de registro todavía existe y está activo.
select tgname, tgenabled
from pg_trigger
where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created';
