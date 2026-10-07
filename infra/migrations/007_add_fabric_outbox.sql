-- ============================================================
-- Migration 007 — Outbox para o Hyperledger Fabric
-- Persistência das mensagens a entregar ao ledger do Fabric (transactional outbox)
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS fabric_outbox (
  id                 bigserial    PRIMARY KEY,
  tipo               varchar(12)  NOT NULL CHECK (tipo IN ('evento', 'checkpoint')),
  referencia         varchar(64)  NOT NULL,
  carga              jsonb        NOT NULL,
  status             varchar(12)  NOT NULL DEFAULT 'pendente'
                                  CHECK (status IN ('pendente', 'confirmado', 'rejeitado')),
  tentativas         integer      NOT NULL DEFAULT 0,
  proxima_tentativa  timestamptz  NOT NULL DEFAULT now(),
  fabric_tx_id       varchar(64),
  ultimo_erro        text,
  criado_em          timestamptz  NOT NULL DEFAULT now(),
  atualizado_em      timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (tipo, referencia)
);

COMMENT ON TABLE fabric_outbox IS 'Mensagens para o Hyperledger Fabric gravadas na mesma transação do bloco da cadeia própria';
COMMENT ON COLUMN fabric_outbox.referencia IS 'Id da transação (evento) ou altura do bloco (checkpoint)';
COMMENT ON COLUMN fabric_outbox.status IS 'pendente → confirmado (commit no Fabric) | rejeitado (chaincode recusou: violação de regra)';

CREATE INDEX IF NOT EXISTS idx_fabric_outbox_pendentes ON fabric_outbox(id) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_fabric_outbox_status    ON fabric_outbox(status);

COMMIT;
