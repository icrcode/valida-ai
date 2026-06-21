-- Migration 005: Re-sincroniza coordenadores_cursos para coordenadores
-- que possuem curso_id em usuarios mas não têm entrada na tabela de vínculo.
--
-- Aplicar:
--   psql -U postgres -d valida_db -f infra/migrations/005_backfill_coordenadores_cursos.sql

INSERT INTO coordenadores_cursos (coordenador_id, curso_id)
SELECT id, curso_id FROM usuarios
WHERE perfil = 'coordenador' AND curso_id IS NOT NULL
ON CONFLICT DO NOTHING;
