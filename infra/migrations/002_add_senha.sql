-- Migration 002: Adiciona autenticação por senha
-- Execute manualmente em DBs existentes:
--   psql -U postgres -d valida_db -f infra/migrations/002_add_senha.sql

-- Adiciona coluna (idempotente)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash TEXT NOT NULL DEFAULT '';

-- Define senha padrão "senha123" para usuários sem senha (todos em DEV)
-- Hash gerado via pgcrypto (bf = Blowfish/bcrypt, 10 rounds)
UPDATE usuarios
SET senha_hash = crypt('senha123', gen_salt('bf', 10))
WHERE senha_hash = '';
