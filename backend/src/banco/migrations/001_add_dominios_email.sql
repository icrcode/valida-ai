-- ============================================================
-- Migration 001: Adiciona dominios_email à tabela instituicoes
-- ============================================================
-- Execute em bancos de dados existentes que foram criados antes
-- desta feature. Para instalações novas, o banco.sql já inclui
-- a coluna.
--
-- Aplicar com:
--   psql -U postgres -d valida_db -f 001_add_dominios_email.sql
--
-- Ou pelo script de dev:
--   .\dev.ps1  /  ./dev.sh   (aplica automaticamente)
-- ============================================================

ALTER TABLE instituicoes
  ADD COLUMN IF NOT EXISTS dominios_email TEXT[] NOT NULL DEFAULT '{}';

-- Exemplo: configurar domínios após a migration
-- UPDATE instituicoes SET dominios_email = ARRAY['catolicasc.org.br', 'catolicasc.edu.br']
-- WHERE sigla = 'CSC';
