-- Migration 004: Cria tabela coordenadores_cursos (relação N:N)
-- Permite que um coordenador seja responsável por mais de um curso.
-- Para instalações novas o banco.sql já contém a tabela.
--
-- Aplicar:
--   psql -U postgres -d valida_db -f infra/migrations/004_add_coordenadores_cursos.sql

BEGIN;

CREATE TABLE IF NOT EXISTS coordenadores_cursos (
  coordenador_id uuid        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  curso_id       uuid        NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coordenador_id, curso_id)
);

CREATE INDEX IF NOT EXISTS idx_coordenadores_cursos_curso_id ON coordenadores_cursos(curso_id);

-- Backfill: vincula coordenadores já existentes ao curso definido em usuarios.curso_id
INSERT INTO coordenadores_cursos (coordenador_id, curso_id)
SELECT id, curso_id FROM usuarios
WHERE perfil = 'coordenador' AND curso_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
