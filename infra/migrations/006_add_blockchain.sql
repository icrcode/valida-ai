-- ============================================================
-- Migration 006 — Blockchain de documentos
-- Registro imutável (append-only) dos eventos de documentos e certificados
-- Aplique em ambientes que já possuem o schema base (banco.sql)
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS blockchain_blocos (
  altura         integer      PRIMARY KEY CHECK (altura >= 0),
  hash           char(64)     NOT NULL UNIQUE,
  hash_anterior  char(64)     NOT NULL,
  conteudo       jsonb        NOT NULL,
  gravado_em     timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE blockchain_blocos IS 'Blocos da blockchain de documentos — encadeados por hash, minerados (PoW) e assinados (Ed25519)';
COMMENT ON COLUMN blockchain_blocos.conteudo IS 'Bloco completo (cabeçalho, assinatura e transações) — revalidado criptograficamente em /api/blockchain/validar';

CREATE TABLE IF NOT EXISTS blockchain_transacoes (
  id             char(64)     PRIMARY KEY,
  bloco_altura   integer      NOT NULL REFERENCES blockchain_blocos(altura),
  indice         integer      NOT NULL,
  tipo           varchar(40)  NOT NULL,
  documento_id   varchar(64),
  hash_arquivo   char(64),
  registrado_em  timestamptz  NOT NULL,
  UNIQUE (bloco_altura, indice)
);

COMMENT ON TABLE blockchain_transacoes IS 'Índice de busca das transações gravadas em blockchain_blocos (fonte da verdade é o jsonb do bloco)';
COMMENT ON COLUMN blockchain_transacoes.documento_id IS 'Sem FK de propósito: a cadeia deve sobreviver mesmo se o documento for removido';

CREATE INDEX IF NOT EXISTS idx_bc_tx_documento_id ON blockchain_transacoes(documento_id);
CREATE INDEX IF NOT EXISTS idx_bc_tx_hash_arquivo ON blockchain_transacoes(hash_arquivo);

-- Append-only: bloqueia UPDATE, DELETE e TRUNCATE nas tabelas da blockchain
CREATE OR REPLACE FUNCTION blockchain_somente_insercao() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'A blockchain é imutável: % não permitido em %', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blockchain_blocos_imutavel ON blockchain_blocos;
CREATE TRIGGER trg_blockchain_blocos_imutavel
  BEFORE UPDATE OR DELETE ON blockchain_blocos
  FOR EACH ROW EXECUTE FUNCTION blockchain_somente_insercao();

DROP TRIGGER IF EXISTS trg_blockchain_blocos_truncate ON blockchain_blocos;
CREATE TRIGGER trg_blockchain_blocos_truncate
  BEFORE TRUNCATE ON blockchain_blocos
  FOR EACH STATEMENT EXECUTE FUNCTION blockchain_somente_insercao();

DROP TRIGGER IF EXISTS trg_blockchain_transacoes_imutavel ON blockchain_transacoes;
CREATE TRIGGER trg_blockchain_transacoes_imutavel
  BEFORE UPDATE OR DELETE ON blockchain_transacoes
  FOR EACH ROW EXECUTE FUNCTION blockchain_somente_insercao();

DROP TRIGGER IF EXISTS trg_blockchain_transacoes_truncate ON blockchain_transacoes;
CREATE TRIGGER trg_blockchain_transacoes_truncate
  BEFORE TRUNCATE ON blockchain_transacoes
  FOR EACH STATEMENT EXECUTE FUNCTION blockchain_somente_insercao();

COMMIT;
