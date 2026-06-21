jest.mock('../../../src/banco/conexao', () => ({
  pool: { query: jest.fn() },
}));
jest.mock('../../../src/modulos/usuarios/repositorio');
jest.mock('../../../src/modulos/documentos/repositorio');
jest.mock('../../../src/servicos/notificacao');
jest.mock('../../../src/servicos/gerador-certificado');
jest.mock('../../../src/modulos/certificados/repositorio');

import { pool } from '../../../src/banco/conexao';
import * as usuariosRepo from '../../../src/modulos/usuarios/repositorio';
import * as documentosRepo from '../../../src/modulos/documentos/repositorio';
import * as notificacao from '../../../src/servicos/notificacao';
import * as geradorCert from '../../../src/servicos/gerador-certificado';
import * as certificadosRepo from '../../../src/modulos/certificados/repositorio';
import { aoDocumentoSubmetido } from '../../../src/eventos/handlers/documento-submetido';
import { aoDocumentoAprovado } from '../../../src/eventos/handlers/documento-aprovado';
import { aoDocumentoReprovado } from '../../../src/eventos/handlers/documento-reprovado';
import { aoDocumentoRevisaoSolicitada } from '../../../src/eventos/handlers/documento-revisao-solicitada';

const mockQuery = pool.query as jest.Mock;
const mockUsuarios = usuariosRepo as jest.Mocked<typeof usuariosRepo>;
const mockDocumentos = documentosRepo as jest.Mocked<typeof documentosRepo>;
const mockNotificacao = notificacao as jest.Mocked<typeof notificacao>;
const mockGerador = geradorCert as jest.Mocked<typeof geradorCert>;
const mockCertRepo = certificadosRepo as jest.Mocked<typeof certificadosRepo>;

const ESTUDANTE_MOCK = {
  id: 'est-1',
  nome: 'João Estudante',
  email: 'joao@uni.edu',
  matricula: '2021001',
  cpf: null,
  endereco: null,
  perfil: 'estudante' as const,
  curso_id: 'curso-1',
  instituicao_id: 'inst-1',
  instituicao_nome: 'Universidade Teste',
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
};

const DOCUMENTO_MOCK = {
  id: 'doc-1',
  titulo: 'Certificado XYZ',
  tipo: 'certificado_curso',
  carga_horaria: 40,
  estudante_id: 'est-1',
  curso_id: 'curso-1',
  status: 'aprovado',
  coordenador_id: 'coord-1',
  nome_arquivo: 'certificado.pdf',
  caminho_arquivo: 'documentos/est-1/certificado.pdf',
  tamanho_arquivo: 1024,
  mime_type: 'application/pdf',
  criado_em: new Date(),
  atualizado_em: new Date(),
};

const COORDENADOR_MOCK = { id: 'coord-1', nome: 'Maria Coord', email: 'maria@uni.edu' };

const CERT_GERADO = {
  hash: 'a'.repeat(64),
  caminhoArquivo: 'certificados/doc-1/aaaa.pdf',
  pdfBuffer: Buffer.from('%PDF'),
};

const CERT_PERSISTIDO = {
  id: 'cert-1',
  documento_id: 'doc-1',
  estudante_id: 'est-1',
  hash: 'a'.repeat(64),
  caminho_arquivo: 'certificados/doc-1/aaaa.pdf',
  criado_em: new Date(),
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// aoDocumentoSubmetido
// ─────────────────────────────────────────────
describe('aoDocumentoSubmetido', () => {
  const payload = {
    documentoId: 'doc-1',
    estudanteId: 'est-1',
    cursoId: 'curso-1',
    titulo: 'Certificado XYZ',
    tipo: 'certificado_curso',
  };

  it('notifica cada coordenador encontrado para o curso', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [COORDENADOR_MOCK, { id: 'coord-2', nome: 'Carlos', email: 'carlos@uni.edu' }] } as any);
    mockNotificacao.notificar.mockResolvedValue(undefined);

    await aoDocumentoSubmetido(payload);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("perfil = 'coordenador'"),
      ['curso-1'],
    );
    expect(mockNotificacao.notificar).toHaveBeenCalledTimes(2);
    expect(mockNotificacao.notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatarioId: 'coord-1',
        destinatarioEmail: 'maria@uni.edu',
        assunto: expect.stringContaining('validação'),
        mensagem: expect.stringContaining('Certificado XYZ'),
      }),
    );
  });

  it('não chama notificar quando não há coordenadores no curso', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);

    await aoDocumentoSubmetido(payload);

    expect(mockNotificacao.notificar).not.toHaveBeenCalled();
  });

  it('captura erro sem propagar exceção quando pool falha', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Timeout de conexão'));

    await expect(aoDocumentoSubmetido(payload)).resolves.not.toThrow();
    expect(mockNotificacao.notificar).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// aoDocumentoAprovado
// ─────────────────────────────────────────────
describe('aoDocumentoAprovado', () => {
  const payload = {
    documentoId: 'doc-1',
    estudanteId: 'est-1',
    coordenadorId: 'coord-1',
    titulo: 'Certificado XYZ',
  };

  it('gera certificado, persiste no banco e notifica o estudante', async () => {
    mockUsuarios.buscarPorId
      .mockResolvedValueOnce(ESTUDANTE_MOCK)
      .mockResolvedValueOnce(COORDENADOR_MOCK as any);
    mockDocumentos.buscarPorId.mockResolvedValueOnce(DOCUMENTO_MOCK);
    mockGerador.gerarEArmazenarCertificado.mockResolvedValueOnce(CERT_GERADO);
    mockCertRepo.criar.mockResolvedValueOnce(CERT_PERSISTIDO);
    mockNotificacao.notificar.mockResolvedValue(undefined);

    await aoDocumentoAprovado(payload);

    expect(mockGerador.gerarEArmazenarCertificado).toHaveBeenCalledTimes(1);
    expect(mockGerador.gerarEArmazenarCertificado).toHaveBeenCalledWith(
      expect.objectContaining({ coordenadorNome: 'Maria Coord' }),
      expect.any(String),
    );
    expect(mockCertRepo.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        documento_id: 'doc-1',
        estudante_id: 'est-1',
        hash: CERT_GERADO.hash,
        caminho_arquivo: CERT_GERADO.caminhoArquivo,
      }),
    );
    expect(mockNotificacao.notificar).toHaveBeenCalledTimes(1);
    expect(mockNotificacao.notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatarioId: 'est-1',
        destinatarioEmail: 'joao@uni.edu',
        assunto: expect.stringContaining('aprovado'),
        mensagem: expect.stringContaining('Certificado XYZ'),
      }),
    );
  });

  it('usa fallback quando coordenador não é encontrado', async () => {
    mockUsuarios.buscarPorId
      .mockResolvedValueOnce(ESTUDANTE_MOCK)
      .mockResolvedValueOnce(null);
    mockDocumentos.buscarPorId.mockResolvedValueOnce(DOCUMENTO_MOCK);
    mockGerador.gerarEArmazenarCertificado.mockResolvedValueOnce(CERT_GERADO);
    mockCertRepo.criar.mockResolvedValueOnce(CERT_PERSISTIDO);
    mockNotificacao.notificar.mockResolvedValue(undefined);

    await aoDocumentoAprovado(payload);

    expect(mockGerador.gerarEArmazenarCertificado).toHaveBeenCalledWith(
      expect.objectContaining({ coordenadorNome: 'Coordenador' }),
      expect.any(String),
    );
  });

  it('não gera certificado quando estudante não é encontrado', async () => {
    mockUsuarios.buscarPorId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(COORDENADOR_MOCK as any);
    mockDocumentos.buscarPorId.mockResolvedValueOnce(DOCUMENTO_MOCK);

    await aoDocumentoAprovado(payload);

    expect(mockGerador.gerarEArmazenarCertificado).not.toHaveBeenCalled();
    expect(mockNotificacao.notificar).not.toHaveBeenCalled();
  });

  it('não gera certificado quando documento não é encontrado', async () => {
    mockUsuarios.buscarPorId
      .mockResolvedValueOnce(ESTUDANTE_MOCK)
      .mockResolvedValueOnce(COORDENADOR_MOCK as any);
    mockDocumentos.buscarPorId.mockResolvedValueOnce(null);

    await aoDocumentoAprovado(payload);

    expect(mockGerador.gerarEArmazenarCertificado).not.toHaveBeenCalled();
  });

  it('captura erro sem propagar exceção quando buscarPorId falha', async () => {
    mockUsuarios.buscarPorId.mockRejectedValueOnce(new Error('DB off'));

    await expect(aoDocumentoAprovado(payload)).resolves.not.toThrow();
  });

  it('captura erro sem propagar exceção quando geração de certificado falha', async () => {
    mockUsuarios.buscarPorId
      .mockResolvedValueOnce(ESTUDANTE_MOCK)
      .mockResolvedValueOnce(COORDENADOR_MOCK as any);
    mockDocumentos.buscarPorId.mockResolvedValueOnce(DOCUMENTO_MOCK);
    mockGerador.gerarEArmazenarCertificado.mockRejectedValueOnce(new Error('PDF falhou'));

    await expect(aoDocumentoAprovado(payload)).resolves.not.toThrow();
  });
});

// ─────────────────────────────────────────────
// aoDocumentoReprovado
// ─────────────────────────────────────────────
describe('aoDocumentoReprovado', () => {
  const payload = {
    documentoId: 'doc-1',
    estudanteId: 'est-1',
    coordenadorId: 'coord-1',
    titulo: 'Certificado XYZ',
    observacoes: 'Documentação incompleta',
  };

  it('notifica o estudante com o motivo da reprovação', async () => {
    mockUsuarios.buscarPorId.mockResolvedValueOnce(ESTUDANTE_MOCK);
    mockNotificacao.notificar.mockResolvedValue(undefined);

    await aoDocumentoReprovado(payload);

    expect(mockNotificacao.notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatarioId: 'est-1',
        assunto: expect.stringContaining('reprovado'),
        mensagem: expect.stringContaining('Documentação incompleta'),
      }),
    );
  });

  it('não chama notificar quando estudante não é encontrado', async () => {
    mockUsuarios.buscarPorId.mockResolvedValueOnce(null);

    await aoDocumentoReprovado(payload);

    expect(mockNotificacao.notificar).not.toHaveBeenCalled();
  });

  it('captura erro sem propagar exceção', async () => {
    mockUsuarios.buscarPorId.mockRejectedValueOnce(new Error('Falha'));

    await expect(aoDocumentoReprovado(payload)).resolves.not.toThrow();
  });
});

// ─────────────────────────────────────────────
// aoDocumentoRevisaoSolicitada
// ─────────────────────────────────────────────
describe('aoDocumentoRevisaoSolicitada', () => {
  const payload = {
    documentoId: 'doc-1',
    estudanteId: 'est-1',
    coordenadorId: 'coord-1',
    titulo: 'Certificado XYZ',
    observacoes: 'Ajustar carga horária',
  };

  it('notifica o estudante com as observações do coordenador', async () => {
    mockUsuarios.buscarPorId.mockResolvedValueOnce(ESTUDANTE_MOCK);
    mockNotificacao.notificar.mockResolvedValue(undefined);

    await aoDocumentoRevisaoSolicitada(payload);

    expect(mockNotificacao.notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatarioId: 'est-1',
        assunto: expect.stringContaining('Revisão'),
        mensagem: expect.stringContaining('Ajustar carga horária'),
      }),
    );
  });

  it('não chama notificar quando estudante não é encontrado', async () => {
    mockUsuarios.buscarPorId.mockResolvedValueOnce(null);

    await aoDocumentoRevisaoSolicitada(payload);

    expect(mockNotificacao.notificar).not.toHaveBeenCalled();
  });

  it('captura erro sem propagar exceção', async () => {
    mockUsuarios.buscarPorId.mockRejectedValueOnce(new Error('Falha'));

    await expect(aoDocumentoRevisaoSolicitada(payload)).resolves.not.toThrow();
  });
});
