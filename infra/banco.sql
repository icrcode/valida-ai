-- ============================================================
-- Valida AI — Sistema de Validação de Horas Complementares
-- Database: PostgreSQL 16
-- ============================================================

-- ============================================================
-- Extensões
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Tipos ENUM
-- ============================================================

-- Perfil de usuário no sistema
CREATE TYPE perfil_usuario AS ENUM ('estudante', 'coordenador', 'admin');

-- Status de processamento de documentos
CREATE TYPE status_documento AS ENUM (
  'pendente',
  'em_analise',
  'aprovado',
  'reprovado',
  'revisao_solicitada',
  'cancelado'
);

-- Tipo de documento enviado
CREATE TYPE tipo_documento_enum AS ENUM (
  'certificado_curso',
  'certificado_evento',
  'declaracao_participacao',
  'comprovante_atividade',
  'artigo_publicado',
  'outro'
);

-- ============================================================
-- Tabela: instituicoes
-- Instituições de ensino cadastradas no sistema
-- ============================================================
CREATE TABLE instituicoes (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            varchar(200)    NOT NULL,
  sigla           varchar(20)     NOT NULL UNIQUE,
  cnpj            varchar(18)     UNIQUE,
  email_contato   varchar(255),
  telefone        varchar(20),
  site            varchar(255),
  logotipo_url    varchar(500),
  endereco        text,
  cidade          varchar(100),
  estado          varchar(2),
  -- Domínios de e-mail aceitos para login. Ex: ARRAY['catolicasc.org.br','catolicasc.edu.br']
  -- Array vazio ({}) significa sem restrição de domínio.
  dominios_email  text[]          NOT NULL DEFAULT '{}',
  ativa           boolean         NOT NULL DEFAULT true,
  criado_em       timestamptz     NOT NULL DEFAULT now(),
  atualizado_em   timestamptz     NOT NULL DEFAULT now()
);

COMMENT ON TABLE instituicoes IS 'Instituições de ensino — uma instituição possui vários cursos';
COMMENT ON COLUMN instituicoes.nome IS 'Ex: Universidade Federal de Santa Catarina';
COMMENT ON COLUMN instituicoes.sigla IS 'Ex: UFSC';
COMMENT ON COLUMN instituicoes.cnpj IS 'Ex: 00.000.000/0001-00';
COMMENT ON COLUMN instituicoes.logotipo_url IS 'Caminho do logotipo no storage (usado no certificado)';

CREATE INDEX idx_instituicoes_sigla ON instituicoes(sigla);
CREATE INDEX idx_instituicoes_cnpj ON instituicoes(cnpj);

-- ============================================================
-- Tabela: cursos
-- Cursos oferecidos por uma instituição
-- ============================================================
CREATE TABLE cursos (
  id                         uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id             uuid            NOT NULL REFERENCES instituicoes(id) ON DELETE RESTRICT,
  nome                       varchar(200)    NOT NULL,
  codigo                     varchar(20)     NOT NULL UNIQUE,
  carga_horaria_complementar integer         NOT NULL DEFAULT 200,
  turno                      varchar(20),
  modalidade                 varchar(20),
  ativo                      boolean         NOT NULL DEFAULT true,
  criado_em                  timestamptz     NOT NULL DEFAULT now(),
  atualizado_em              timestamptz     NOT NULL DEFAULT now()
);

COMMENT ON TABLE cursos IS 'Cursos da instituição — define a carga horária mínima de atividades complementares';
COMMENT ON COLUMN cursos.nome IS 'Ex: Ciência da Computação';
COMMENT ON COLUMN cursos.codigo IS 'Ex: CC001';
COMMENT ON COLUMN cursos.turno IS 'Valores: matutino | vespertino | noturno | integral';
COMMENT ON COLUMN cursos.modalidade IS 'Valores: presencial | ead | hibrido';

CREATE INDEX idx_cursos_codigo ON cursos(codigo);
CREATE INDEX idx_cursos_instituicao_id ON cursos(instituicao_id);

-- ============================================================
-- Tabela: usuarios
-- Armazena estudantes, coordenadores e admins do sistema
-- ============================================================
CREATE TABLE usuarios (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            varchar(200)    NOT NULL,
  email           varchar(255)    NOT NULL UNIQUE,
  senha_hash      text            NOT NULL DEFAULT '',
  matricula       varchar(50),
  cpf             varchar(14),
  endereco        text,
  perfil          perfil_usuario  NOT NULL,
  microsoft_id    varchar(255)    UNIQUE,
  curso_id        uuid            REFERENCES cursos(id) ON DELETE SET NULL,
  ativo           boolean         NOT NULL DEFAULT true,
  criado_em       timestamptz     NOT NULL DEFAULT now(),
  atualizado_em   timestamptz     NOT NULL DEFAULT now()
);

COMMENT ON TABLE usuarios IS 'Usuários do sistema — estudantes submetem documentos, coordenadores validam';
COMMENT ON COLUMN usuarios.matricula IS 'Matrícula acadêmica (apenas estudantes)';
COMMENT ON COLUMN usuarios.microsoft_id IS 'ID do Azure AD para OAuth2';
COMMENT ON COLUMN usuarios.curso_id IS 'Curso vinculado ao usuário';

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_microsoft_id ON usuarios(microsoft_id);
CREATE INDEX idx_usuarios_perfil ON usuarios(perfil);
CREATE INDEX idx_usuarios_curso_id ON usuarios(curso_id);

-- ============================================================
-- Tabela: documentos
-- Certificados e comprovantes enviados pelos estudantes
-- ============================================================
CREATE TABLE documentos (
  id                uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo            varchar(200)        NOT NULL,
  descricao         text,
  tipo              tipo_documento_enum NOT NULL,
  carga_horaria     integer,
  estudante_id      uuid                NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  curso_id          uuid                NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
  status            status_documento    NOT NULL DEFAULT 'pendente',
  coordenador_id    uuid                REFERENCES usuarios(id) ON DELETE SET NULL,
  motivo_reprovacao text,
  observacoes       text,
  nome_arquivo      varchar(255)        NOT NULL,
  caminho_arquivo   varchar(500)        NOT NULL,
  tamanho_arquivo   bigint              NOT NULL,
  mime_type         varchar(100)        NOT NULL,
  criado_em         timestamptz         NOT NULL DEFAULT now(),
  atualizado_em     timestamptz         NOT NULL DEFAULT now()
);

COMMENT ON TABLE documentos IS 'Documentos acadêmicos enviados pelos estudantes para validação de horas complementares';
COMMENT ON COLUMN documentos.tipo IS 'Valores: certificado_curso | certificado_evento | declaracao_participacao | comprovante_atividade | artigo_publicado | outro';
COMMENT ON COLUMN documentos.carga_horaria IS 'Horas declaradas pelo estudante';
COMMENT ON COLUMN documentos.status IS 'Valores: pendente | em_analise | aprovado | reprovado | revisao_solicitada | cancelado';
COMMENT ON COLUMN documentos.coordenador_id IS 'Coordenador responsável pela análise';
COMMENT ON COLUMN documentos.caminho_arquivo IS 'Chave do objeto no MinIO/S3';

CREATE INDEX idx_documentos_estudante_id ON documentos(estudante_id);
CREATE INDEX idx_documentos_curso_id ON documentos(curso_id);
CREATE INDEX idx_documentos_coordenador_id ON documentos(coordenador_id);
CREATE INDEX idx_documentos_status ON documentos(status);
CREATE INDEX idx_documentos_criado_em ON documentos(criado_em);
CREATE INDEX idx_documentos_estudante_status ON documentos(estudante_id, status);
CREATE INDEX idx_documentos_curso_status ON documentos(curso_id, status);

-- ============================================================
-- Tabela: certificados_horas_complementares
-- Comprovante oficial gerado após aprovação do documento
-- ============================================================
CREATE TABLE certificados_horas_complementares (
  id                     uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id           uuid            NOT NULL UNIQUE REFERENCES documentos(id) ON DELETE CASCADE,
  estudante_id           uuid            NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  coordenador_id         uuid            NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  curso_id               uuid            NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
  instituicao_id         uuid            NOT NULL REFERENCES instituicoes(id) ON DELETE RESTRICT,
  carga_horaria_validada integer         NOT NULL,
  hash_verificacao       varchar(64)     NOT NULL UNIQUE,
  qr_code_url            varchar(500)    NOT NULL,
  caminho_arquivo        varchar(500)    NOT NULL,
  emitido_em             timestamptz     NOT NULL DEFAULT now(),
  valido_ate             timestamptz
);

COMMENT ON TABLE certificados_horas_complementares IS 'Certificado oficial de horas complementares — emitido após aprovação, verificável via QR code';
COMMENT ON COLUMN certificados_horas_complementares.documento_id IS '1 documento aprovado = 1 certificado (relação 1:1)';
COMMENT ON COLUMN certificados_horas_complementares.hash_verificacao IS 'Hash SHA256 para verificação pública via QR code';
COMMENT ON COLUMN certificados_horas_complementares.qr_code_url IS 'URL pública: /verificar/:hash';
COMMENT ON COLUMN certificados_horas_complementares.caminho_arquivo IS 'Chave do PDF do certificado no MinIO/S3';

CREATE INDEX idx_cert_horas_hash ON certificados_horas_complementares(hash_verificacao);
CREATE INDEX idx_cert_horas_estudante_id ON certificados_horas_complementares(estudante_id);
CREATE INDEX idx_cert_horas_curso_id ON certificados_horas_complementares(curso_id);
CREATE INDEX idx_cert_horas_instituicao_id ON certificados_horas_complementares(instituicao_id);

-- ============================================================
-- Tabela: certificados
-- Certificados PDF gerados após aprovação de documentos
-- ============================================================
CREATE TABLE certificados (
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

CREATE INDEX idx_certificados_hash          ON certificados(hash);
CREATE INDEX idx_certificados_estudante_id  ON certificados(estudante_id);
CREATE INDEX idx_certificados_documento_id  ON certificados(documento_id);

-- ============================================================
-- Tabela: historico_validacoes
-- Trilha de auditoria de todas as ações sobre documentos
-- ============================================================
CREATE TABLE historico_validacoes (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id    uuid            NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  usuario_id      uuid            NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  status_anterior status_documento NOT NULL,
  status_novo     status_documento NOT NULL,
  observacoes     text,
  metadados       jsonb,
  ocorrido_em     timestamptz     NOT NULL DEFAULT now()
);

COMMENT ON TABLE historico_validacoes IS 'Auditoria imutável de todas as transições de status dos documentos';
COMMENT ON COLUMN historico_validacoes.usuario_id IS 'Quem realizou a ação';
COMMENT ON COLUMN historico_validacoes.metadados IS 'Dados extras: IP, User-Agent, etc.';

CREATE INDEX idx_historico_documento_id ON historico_validacoes(documento_id);
CREATE INDEX idx_historico_usuario_id ON historico_validacoes(usuario_id);
CREATE INDEX idx_historico_ocorrido_em ON historico_validacoes(ocorrido_em);

-- ============================================================
-- Tabela: sessoes_refresh
-- Controle de refresh tokens para renovação de autenticação
-- ============================================================
CREATE TABLE sessoes_refresh (
  id          uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid            NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  varchar(64)     NOT NULL UNIQUE,
  expira_em   timestamptz     NOT NULL,
  criado_em   timestamptz     NOT NULL DEFAULT now(),
  revogado_em timestamptz
);

COMMENT ON TABLE sessoes_refresh IS 'Refresh tokens para renovar sessão sem novo login Microsoft';
COMMENT ON COLUMN sessoes_refresh.token_hash IS 'Hash SHA256 do refresh token';

CREATE INDEX idx_sessoes_token_hash ON sessoes_refresh(token_hash);
CREATE INDEX idx_sessoes_usuario_id ON sessoes_refresh(usuario_id);
CREATE INDEX idx_sessoes_expira_em ON sessoes_refresh(expira_em);

-- ============================================================
-- Triggers para atualização de atualizado_em
-- ============================================================

CREATE OR REPLACE FUNCTION atualiza_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualiza_instituicoes BEFORE UPDATE ON instituicoes
  FOR EACH ROW EXECUTE FUNCTION atualiza_timestamp();

CREATE TRIGGER trigger_atualiza_cursos BEFORE UPDATE ON cursos
  FOR EACH ROW EXECUTE FUNCTION atualiza_timestamp();

CREATE TRIGGER trigger_atualiza_usuarios BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION atualiza_timestamp();

CREATE TRIGGER trigger_atualiza_documentos BEFORE UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION atualiza_timestamp();

-- ============================================================
-- Fim do script
-- ============================================================
