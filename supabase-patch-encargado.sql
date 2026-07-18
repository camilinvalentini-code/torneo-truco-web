-- Campo opcional: quién de la cuenta organizó este torneo puntual
-- (útil cuando varias personas comparten el mismo login del bar).
alter table tournaments add column if not exists encargado text;
