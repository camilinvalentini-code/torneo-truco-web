-- Parche 2 de seguridad: Postgres le da permiso a "PUBLIC" (todo el mundo)
-- apenas se crea una función, salvo que se lo saques explícitamente. El
-- parche anterior le sacó el permiso a "anon" puntual, pero no a "PUBLIC",
-- así que en los hechos seguía quedando abierto. Esto lo termina de cerrar.

revoke execute on function public.declarar_ganador(uuid, uuid) from public;
revoke execute on function public.generar_bracket(uuid, text, uuid[]) from public;

-- Confirmamos que organizadores/admin logueados sigan pudiendo usarlas
-- (esto no lo saca el revoke de arriba, pero lo reafirmamos por las dudas).
grant execute on function public.declarar_ganador(uuid, uuid) to authenticated;
grant execute on function public.generar_bracket(uuid, text, uuid[]) to authenticated;
