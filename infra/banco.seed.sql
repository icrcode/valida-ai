-- ============================================================
-- Valida AI — Dados de desenvolvimento (seed)
-- Executado automaticamente pelo Docker na primeira inicializacao.
-- NAO use em producao.
-- ============================================================

INSERT INTO instituicoes (nome, sigla, cidade, estado, dominios_email) VALUES
  ('Catolica SC',          'CSC',      'Joinville',     'SC', ARRAY['catolicasc.org.br', 'catolicasc.edu.br']),
  ('SENAI Santa Catarina', 'SENAI-SC', 'Florianopolis', 'SC', ARRAY['sc.senai.br']),
  ('UFSC',                 'UFSC',     'Florianopolis', 'SC', ARRAY['ufsc.br', 'grad.ufsc.br']);

WITH inst AS (SELECT sigla, id FROM instituicoes)
INSERT INTO cursos (instituicao_id, nome, codigo, carga_horaria_complementar, turno, modalidade)
SELECT i.id, v.nome, v.codigo, v.carga, v.turno, v.modalidade
FROM (VALUES
  ('CSC',      'Ciencia da Computacao',          'CSC-CC01',    200, 'noturno',    'presencial'),
  ('CSC',      'Engenharia de Software',          'CSC-ES01',    180, 'noturno',    'presencial'),
  ('SENAI-SC', 'Tecnico em Informatica',          'SENAI-TI01',  120, 'matutino',   'presencial'),
  ('SENAI-SC', 'Tecnico em Automacao Industrial', 'SENAI-AUT01', 120, 'vespertino', 'presencial'),
  ('UFSC',     'Sistemas de Informacao',          'UFSC-SI01',   216, 'matutino',   'presencial')
) AS v(sigla, nome, codigo, carga, turno, modalidade)
JOIN inst i ON i.sigla = v.sigla;

INSERT INTO usuarios (nome, email, perfil) VALUES
  ('Administrador', 'admin@validaai.com.br', 'admin');

WITH cur AS (SELECT codigo, id FROM cursos)
INSERT INTO usuarios (nome, email, perfil, curso_id)
SELECT v.nome, v.email, 'coordenador', c.id
FROM (VALUES
  ('Prof. Ricardo Gomes',  'coord.cc@catolicasc.org.br', 'CSC-CC01'),
  ('Profa. Fernanda Lima', 'coord.es@catolicasc.org.br', 'CSC-ES01'),
  ('Prof. Marcos Souza',   'coord.ti@sc.senai.br',       'SENAI-TI01'),
  ('Profa. Juliana Melo',  'coord.aut@sc.senai.br',      'SENAI-AUT01'),
  ('Prof. Carlos Ramos',   'coord.si@ufsc.br',           'UFSC-SI01')
) AS v(nome, email, codigo)
JOIN cur c ON c.codigo = v.codigo;

WITH cur AS (SELECT codigo, id FROM cursos)
INSERT INTO usuarios (nome, email, matricula, perfil, curso_id)
SELECT v.nome, v.email, v.matricula, 'estudante', c.id
FROM (VALUES
  ('Joao Pedro Silva',        'joao.silva@catolicasc.edu.br',    'CSC2021001',   'CSC-CC01'),
  ('Maria Clara Santos',      'maria.santos@catolicasc.edu.br',  'CSC2021002',   'CSC-CC01'),
  ('Pedro Henrique Oliveira', 'pedro.oliveira@catolicasc.org.br','CSC2022001',   'CSC-ES01'),
  ('Ana Paula Lima',          'ana.lima@sc.senai.br',            'SENAI2021001', 'SENAI-TI01'),
  ('Carlos Eduardo Souza',    'carlos.souza@sc.senai.br',        'SENAI2021002', 'SENAI-TI01'),
  ('Beatriz Costa Ferreira',  'beatriz.costa@sc.senai.br',       'SENAI2022001', 'SENAI-AUT01'),
  ('Lucas Martins Alves',     'lucas.alves@grad.ufsc.br',        'UFSC20211001', 'UFSC-SI01')
) AS v(nome, email, matricula, codigo)
JOIN cur c ON c.codigo = v.codigo;
