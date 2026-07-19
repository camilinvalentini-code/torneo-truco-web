-- Para fusionar "Compartir cruces" y "Nuevos cruces" en un solo botón:
-- separamos el aviso de "tal equipo espera rival" del aviso de "el
-- cruce ya está definido". Así, cuando a un equipo que esperaba le
-- aparece el rival, se vuelve a avisar como cruce nuevo — sin repetir
-- lo que ya se avisó antes.
alter table matches add column if not exists avisado_espera boolean not null default false;
