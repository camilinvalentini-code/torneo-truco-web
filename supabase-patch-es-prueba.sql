-- Marca los torneos creados con el generador de prueba, para que el
-- botón de "simular resultados al azar" solo aparezca ahí, no en
-- torneos reales.
alter table tournaments add column if not exists es_prueba boolean not null default false;
