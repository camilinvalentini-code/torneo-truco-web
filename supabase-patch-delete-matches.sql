-- Parche: faltaba el permiso para borrar partidos (matches).
-- Por eso "Resortear" y "quitar del repechaje" no borraban los partidos viejos
-- y quedaban duplicados. Ejecutar una sola vez en el SQL Editor de Supabase.

create policy "dueño o admin borra partidos" on matches for delete
  using (exists (
    select 1 from tournaments t where t.id = tournament_id
    and (t.organizador_id = auth.uid() or public.is_admin())
  ));
