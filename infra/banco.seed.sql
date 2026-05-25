-- ============================================================
-- Valida AI — Dados de desenvolvimento (seed)
-- Executado automaticamente pelo Docker na primeira inicializacao.
-- NAO use em producao.
-- Senha padrão de todos os usuarios de desenvolvimento: senha123
-- ============================================================

INSERT INTO instituicoes (nome, sigla, cidade, estado, dominios_email) VALUES
  ('Católica SC',          'CSC',      'Joinville',     'SC', ARRAY['catolicasc.org.br', 'catolicasc.edu.br']),
  ('SENAI Santa Catarina', 'SENAI-SC', 'Florianópolis', 'SC', ARRAY['sc.senai.br']),
  ('UFSC',                 'UFSC',     'Florianópolis', 'SC', ARRAY['ufsc.br', 'grad.ufsc.br']);

WITH inst AS (SELECT sigla, id FROM instituicoes)
INSERT INTO cursos (instituicao_id, nome, codigo, carga_horaria_complementar, turno, modalidade)
SELECT i.id, v.nome, v.codigo, v.carga, v.turno, v.modalidade
FROM (VALUES
  ('CSC',      'Ciência da Computação',          'CSC-CC01',    200, 'noturno',    'presencial'),
  ('CSC',      'Engenharia de Software',          'CSC-ES01',    180, 'noturno',    'presencial'),
  ('SENAI-SC', 'Técnico em Informática',          'SENAI-TI01',  120, 'matutino',   'presencial'),
  ('SENAI-SC', 'Técnico em Automação Industrial', 'SENAI-AUT01', 120, 'vespertino', 'presencial'),
  ('UFSC',     'Sistemas de Informação',          'UFSC-SI01',   216, 'matutino',   'presencial')
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
  ('João Pedro Silva',        'joao.silva@catolicasc.edu.br',    'CSC2021001',   'CSC-CC01'),
  ('Maria Clara Santos',      'maria.santos@catolicasc.edu.br',  'CSC2021002',   'CSC-CC01'),
  ('Pedro Henrique Oliveira', 'pedro.oliveira@catolicasc.org.br','CSC2022001',   'CSC-ES01'),
  ('Ana Paula Lima',          'ana.lima@sc.senai.br',            'SENAI2021001', 'SENAI-TI01'),
  ('Carlos Eduardo Souza',    'carlos.souza@sc.senai.br',        'SENAI2021002', 'SENAI-TI01'),
  ('Beatriz Costa Ferreira',  'beatriz.costa@sc.senai.br',       'SENAI2022001', 'SENAI-AUT01'),
  ('Lucas Martins Alves',     'lucas.alves@grad.ufsc.br',        'UFSC20211001', 'UFSC-SI01')
) AS v(nome, email, matricula, codigo)
JOIN cur c ON c.codigo = v.codigo;

-- Define a senha padrão "senha123" para todos os usuários de desenvolvimento.
-- O hash é gerado com bcrypt (bf = Blowfish, 10 rounds), compatível com bcryptjs.
-- WHERE garante que apenas usuários sem senha (recém-inseridos pelo seed) sejam afetados.
UPDATE usuarios SET senha_hash = crypt('senha123', gen_salt('bf', 10))
WHERE senha_hash IS NULL;
