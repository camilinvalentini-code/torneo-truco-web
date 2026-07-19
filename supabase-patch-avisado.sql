-- Permite compartir por WhatsApp solo los cruces nuevos (sin repetir los
-- que ya se avisaron antes) — útil en el Sistema Vidon Bar, donde van
-- apareciendo cruces nuevos de a uno mientras otros siguen en juego.
alter table matches add column if not exists avisado boolean not null default false;
