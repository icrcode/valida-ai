jest.mock('../../../src/banco/conexao', () => ({
  pool: { query: jest.fn() },
}));
jest.mock('../../../src/modulos/usuarios/repositorio');
jest.mock('../../../src/servicos/notificacao');

import { pool } from '../../../src/banco/conexao';
import * as usuariosRepo from '../../../src/modulos/usuarios/repositorio';
import * as notificacao from '../../../src/servicos/notificacao';
import { aoDocumentoSubmetido } from '../../../src/eventos/handlers/documento-submetido';
import { aoDocumentoAprovado } from '../../../src/eventos/handlers/documento-aprovado';
import { aoDocumentoReprovado } from '../../../src/eventos/handlers/documento-reprovado';
import { aoDocumentoRevisaoSolicitada } from '../../../src/eventos/handlers/documento-revisao-solicitada';

const mockQuery = pool.query as jest.Mock;
const mockUsuarios = usuariosRepo as jest.Mocked<typeof usuariosRepo>;
const mockNotificacao = notificacao as jest.Mocked<typeof notificacao>;

const ESTUDANTE_MOCK = {
  id: 'est-1',
  nome: 'João Estudante',
  email: 'joao@uni.edu',
  matricula: '2021001',
  perfil: 'estudante' as const,
  curso_id: 'curso-1',
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
};

const COORDENADOR_MOCK = { id: 'coord-1', nome: 'Maria Coord', email: 'maria@uni.edu' };

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// aoDocumentoSubmetido
// ─────────────────────────────────────────────
describe('aoDocumentoSubmetido', () => {
  const payload = {
    documentoId: 'doc-1',
    estudanteId: 'est-1',
    cursoId: 'curso-1',
    titulo: 'Estágio XYZ',
    tipo: 'estagio',
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
        mensagem: expect.stringContaining('Estágio XYZ'),
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
    titulo: 'Estágio XYZ',
  };

  it('notifica o estudante com mensagem de aprovação', async () => {
    mockUsuarios.buscarPorId.mockResolvedValueOnce(ESTUDANTE_MOCK);
    mockNotificacao.notificar.mockResolvedValue(undefined);

    await aoDocumentoAprovado(payload);

    expect(mockNotificacao.notificar).toHaveBeenCalledTimes(1);
    expect(mockNotificacao.notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatarioId: 'est-1',
        destinatarioEmail: 'joao@uni.edu',
        assunto: expect.stringContaining('aprovado'),
        mensagem: expect.stringContaining('Estágio XYZ'),
      }),
    );
  });

  it('não chama notificar quando estudante não é encontrado', async () => {
    mockUsuarios.buscarPorId.mockResolvedValueOnce(null);

    await aoDocumentoAprovado(payload);

    expect(mockNotificacao.notificar).not.toHaveBeenCalled();
  });

  it('captura erro sem propagar exceção quando buscarPorId falha', async () => {
    mockUsuarios.buscarPorId.mockRejectedValueOnce(new Error('DB off'));

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
    titulo: 'Estágio XYZ',
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
    titulo: 'Estágio XYZ',
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
