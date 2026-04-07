-- ============================================================
-- Migration 001 — Tabela certificados
-- Aplique em ambientes que já possuem o schema base (banco.sql)
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS certificados (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id     uuid         NOT NULL UNIQUE REFERENCES documentos(id) ON DELETE CASCADE,
  estudante_id     uuid         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  hash             varchar(64)  NOT NULL UNIQUE,
  caminho_arquivo  varchar(500) NOT NULL,
  criado_em        timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE certificados IS 'Certificados PDF emitidos após aprovação de documento — verificáveis publicamente pelo hash';
COMMENT ON COLUMN certificados.documento_id IS '1 documento aprovado gera exatamente 1 certificado (relação 1:1)';
COMMENT ON COLUMN certificados.hash IS 'SHA-256 hex (64 chars) — usado na URL pública de verificação';
COMMENT ON COLUMN certificados.caminho_arquivo IS 'Chave do PDF no bucket MinIO valida-certificados';

CREATE INDEX IF NOT EXISTS idx_certificados_hash         ON certificados(hash);
CREATE INDEX IF NOT EXISTS idx_certificados_estudante_id ON certificados(estudante_id);
CREATE INDEX IF NOT EXISTS idx_certificados_documento_id ON certificados(documento_id);

COMMIT;
