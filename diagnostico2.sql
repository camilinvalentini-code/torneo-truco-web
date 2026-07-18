-- Solo lectura. Confirma si "public" (o sea, cualquiera) puede disparar
-- el trigger de registro de nuevo.
select grantee, privilege_type
from information_schema.role_routine_grants
where routine_name = 'handle_new_user';
