-- ============================================================
-- Valida AI — Dados de desenvolvimento (seed)
-- Executado automaticamente pelo Docker na primeira inicialização.
-- NÃO use em produção.
-- ============================================================

-- ============================================================
-- Instituições
-- ============================================================
INSERT INTO instituicoes (nome, sigla, cidade, estado, dominios_email) VALUES
  ('Católica SC',      'CSC',      'Joinville',    'SC', ARRAY['catolicasc.org.br', 'catolicasc.edu.br']),
  ('SENAI Santa Catarina', 'SENAI-SC', 'Florianópolis', 'SC', ARRAY['sc.senai.br']),
  ('UFSC',             'UFSC',     'Florianópolis', 'SC', ARRAY['ufsc.br', 'grad.ufsc.br']);

-- ============================================================
-- Cursos
-- ============================================================
INSERT INTO cursos (instituicao_id, nome, codigo, carga_horaria_complementar, turno, modalidade) VALUES
  -- Católica SC
  (
    (SELECT id FROM instituicoes WHERE sigla = 'CSC'),
    'Ciência da Computação', 'CSC-CC01', 200, 'noturno', 'presencial'
  ),
  (
    (SELECT id FROM instituicoes WHERE sigla = 'CSC'),
    'Engenharia de Software', 'CSC-ES01', 180, 'noturno', 'presencial'
  ),
  -- SENAI SC
  (
    (SELECT id FROM instituicoes WHERE sigla = 'SENAI-SC'),
    'Técnico em Informática', 'SENAI-TI01', 120, 'matutino', 'presencial'
  ),
  (
    (SELECT id FROM instituicoes WHERE sigla = 'SENAI-SC'),
    'Técnico em Automação Industrial', 'SENAI-AUT01', 120, 'vespertino', 'presencial'
  ),
  -- UFSC
  (
    (SELECT id FROM instituicoes WHERE sigla = 'UFSC'),
    'Sistemas de Informação', 'UFSC-SI01', 216, 'matutino', 'presencial'
  );

-- ============================================================
-- Usuários — Admin do sistema (sem curso vinculado)
-- ============================================================
INSERT INTO usuarios (nome, email, perfil) VALUES
  ('Administrador', 'admin@validaai.com.br', 'admin');

-- ============================================================
-- Usuários — Coordenadores (um por curso)
-- ============================================================
INSERT INTO usuarios (nome, email, perfil, curso_id) VALUES
  (
    'Prof. Ricardo Gomes',
    'coord.cc@catolicasc.org.br',
    'coordenador',
    (SELECT id FROM cursos WHERE codigo = 'CSC-CC01')
  ),
  (
    'Profa. Fernanda Lima',
    'coord.es@catolicasc.org.br',
    'coordenador',
    (SELECT id FROM cursos WHERE codigo = 'CSC-ES01')
  ),
  (
    'Prof. Marcos Souza',
    'coord.ti@sc.senai.br',
    'coordenador',
    (SELECT id FROM cursos WHERE codigo = 'SENAI-TI01')
  ),
  (
    'Profa. Juliana Melo',
    'coord.aut@sc.senai.br',
    'coordenador',
    (SELECT id FROM cursos WHERE codigo = 'SENAI-AUT01')
  ),
  (
    'Prof. Carlos Ramos',
    'coord.si@ufsc.br',
    'coordenador',
    (SELECT id FROM cursos WHERE codigo = 'UFSC-SI01')
  );

-- ============================================================
-- Usuários — Estudantes
-- ============================================================
INSERT INTO usuarios (nome, email, matricula, perfil, curso_id) VALUES
  -- Católica SC — Ciência da Computação
  (
    'João Pedro Silva',
    'joao.silva@catolicasc.edu.br',
    'CSC2021001',
    'estudante',
    (SELECT id FROM cursos WHERE codigo = 'CSC-CC01')
  ),
  (
    'Maria Clara Santos',
    'maria.santos@catolicasc.edu.br',
    'CSC2021002',
    'estudante',
    (SELECT id FROM cursos WHERE codigo = 'CSC-CC01')
  ),
  -- Católica SC — Engenharia de Software
  (
    'Pedro Henrique Oliveira',
    'pedro.oliveira@catolicasc.org.br',
    'CSC2022001',
    'estudante',
    (SELECT id FROM cursos WHERE codigo = 'CSC-ES01')
  ),
  -- SENAI SC — Técnico em Informática
  (
    'Ana Paula Lima',
    'ana.lima@sc.senai.br',
    'SENAI2021001',
    'estudante',
    (SELECT id FROM cursos WHERE codigo = 'SENAI-TI01')
  ),
  (
    'Carlos Eduardo Souza',
    'carlos.souza@sc.senai.br',
    'SENAI2021002',
    'estudante',
    (SELECT id FROM cursos WHERE codigo = 'SENAI-TI01')
  ),
  -- SENAI SC — Automação
  (
    'Beatriz Costa Ferreira',
    'beatriz.costa@sc.senai.br',
    'SENAI2022001',
    'estudante',
    (SELECT id FROM cursos WHERE codigo = 'SENAI-AUT01')
  ),
  -- UFSC — Sistemas de Informação
  (
    'Lucas Martins Alves',
    'lucas.alves@grad.ufsc.br',
    'UFSC20211001',
    'estudante',
    (SELECT id FROM cursos WHERE codigo = 'UFSC-SI01')
  );
