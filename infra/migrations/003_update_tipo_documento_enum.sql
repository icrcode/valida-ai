-- Migration 003: Atualiza tipo_documento_enum para os novos tipos do sistema
-- Execute em bancos existentes criados com o schema antigo (estagio, tcc, extensao, monitoria).
-- Para instalações novas o banco.sql já contém os valores corretos.
--
-- Aplicar:
--   psql -U postgres -d valida_db -f infra/migrations/003_update_tipo_documento_enum.sql

BEGIN;

-- Renomeia o tipo antigo para não conflitar
ALTER TYPE tipo_documento_enum RENAME TO tipo_documento_enum_old;

-- Cria o novo tipo com os valores corretos
CREATE TYPE tipo_documento_enum AS ENUM (
  'certificado_curso',
  'certificado_evento',
  'declaracao_participacao',
  'comprovante_atividade',
  'artigo_publicado',
  'outro'
);

-- Migra a coluna: valores antigos são mapeados para 'outro'
ALTER TABLE documentos
  ALTER COLUMN tipo TYPE tipo_documento_enum
  USING (
    CASE tipo::text
      WHEN 'estagio'   THEN 'outro'
      WHEN 'tcc'       THEN 'outro'
      WHEN 'extensao'  THEN 'outro'
      WHEN 'monitoria' THEN 'outro'
      ELSE tipo::text
    END
  )::tipo_documento_enum;

-- Remove o tipo antigo
DROP TYPE tipo_documento_enum_old;

COMMIT;
