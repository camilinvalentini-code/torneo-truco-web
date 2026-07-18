-- Solo lectura, no cambia nada. Te dice qué falta de verdad.
select
  exists (select 1 from information_schema.columns where table_name='profiles' and column_name='slug') as tiene_slug_10,
  exists (select 1 from information_schema.columns where table_name='tournaments' and column_name='encargado') as tiene_encargado_11,
  exists (select 1 from information_schema.columns where table_name='tournaments' and column_name='modo') as tiene_modo_13,
  exists (select 1 from information_schema.routines where routine_name='generar_bracket_vidon') as tiene_funcion_vidon_13;
