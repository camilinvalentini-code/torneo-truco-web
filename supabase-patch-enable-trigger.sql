-- El gatillo que crea el perfil de cada usuario nuevo existía, pero
-- estaba desactivado (por eso nunca fallaba con error, simplemente
-- nunca se ejecutaba).
alter table auth.users enable trigger on_auth_user_created;
