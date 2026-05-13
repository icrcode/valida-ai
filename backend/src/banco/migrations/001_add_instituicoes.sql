-- ============================================================
-- Migration 001: Suporte a múltiplas instituições
-- ============================================================
-- Execute uma vez no banco de dados antes de usar o sistema.
-- Compatível com PostgreSQL 14+.

-- Tabela de instituições
CREATE TABLE IF NOT EXISTS instituicoes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            VARCHAR(255)  NOT NULL,
  -- Domínios de e-mail aceitos. Ex: ARRAY['catolicasc.org.br', 'catolicasc.edu.br']
  -- Se vazio ({}), não há restrição de domínio para esta instituição.
  dominios_email  TEXT[]        NOT NULL DEFAULT '{}',
  ativo           BOOLEAN       NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Vincula usuários à instituição
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS instituicao_id UUID REFERENCES instituicoes(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_instituicao_id ON usuarios(instituicao_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email_lower    ON usuarios(LOWER(email));

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_instituicoes_updated_at ON instituicoes;
CREATE TRIGGER trg_instituicoes_updated_at
  BEFORE UPDATE ON instituicoes
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

-- ============================================================
-- Dados de exemplo — ajuste conforme sua instituição
-- ============================================================
-- INSERT INTO instituicoes (nome, dominios_email) VALUES
--   ('Católica SC', ARRAY['catolicasc.org.br', 'catolicasc.edu.br']),
--   ('SENAI SC',    ARRAY['sc.senai.br']),
--   ('UFSC',        ARRAY['ufsc.br', 'grad.ufsc.br']);
--
-- -- Vincule cada usuário à sua instituição:
-- UPDATE usuarios SET instituicao_id = (SELECT id FROM instituicoes WHERE nome = 'Católica SC')
-- WHERE email LIKE '%@catolicasc.org.br' OR email LIKE '%@catolicasc.edu.br';
