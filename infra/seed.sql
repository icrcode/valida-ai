-- ============================================================
-- Seed: dados de desenvolvimento
-- Execute após banco.sql para popular o banco com dados de teste
-- ============================================================

-- Instituição
INSERT INTO instituicoes (id, nome, sigla, cnpj, email_contato, cidade, estado)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Universidade Federal de Exemplo',
  'UFE',
  '00.000.000/0001-00',
  'contato@ufe.edu.br',
  'São Paulo',
  'SP'
);

-- Cursos
INSERT INTO cursos (id, instituicao_id, nome, codigo, carga_horaria_complementar, turno, modalidade)
VALUES
  (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Ciência da Computação',
    'CC001',
    200,
    'noturno',
    'presencial'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Sistemas de Informação',
    'SI001',
    160,
    'noturno',
    'presencial'
  );

-- Usuários
INSERT INTO usuarios (nome, email, perfil, matricula, curso_id)
VALUES
  -- Admin (sem curso)
  ('Admin Sistema', 'admin@teste.com', 'admin', NULL, NULL),

  -- Coordenador
  ('Coord. João Silva', 'coordenador@teste.com', 'coordenador', NULL, 'bbbbbbbb-0000-0000-0000-000000000001'),

  -- Estudantes
  ('Ana Souza', 'estudante@teste.com', 'estudante', '20210001', 'bbbbbbbb-0000-0000-0000-000000000001'),
  ('Carlos Lima', 'carlos@teste.com', 'estudante', '20210002', 'bbbbbbbb-0000-0000-0000-000000000002');
