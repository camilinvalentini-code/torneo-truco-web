-- Amplía las opciones de puntos del tanteador a 15, 20, 30 o 40
-- (20/30/40 son los objetivos típicos del truco uruguayo).
-- Seguro correrlo aunque ya hayas corrido el patch anterior de puntos.

alter table tournaments drop constraint if exists tournaments_puntos_max_check;
alter table tournaments add constraint tournaments_puntos_max_check check (puntos_max in (15, 20, 30, 40));
