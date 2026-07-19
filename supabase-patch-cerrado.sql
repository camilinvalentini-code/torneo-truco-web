-- Permite marcar un torneo como cerrado a mano (se cortó, se canceló,
-- era de prueba, etc.) sin que haya un campeón real definido.
alter table tournaments add column if not exists cerrado boolean not null default false;
