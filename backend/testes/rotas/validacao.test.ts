import request from 'supertest';

jest.mock('../../src/modulos/validacao/repositorio');
jest.mock('../../src/modulos/documentos/repositorio');
jest.mock('../../src/eventos/barramento', () => ({
  barramento: { emitir: jest.fn() },
}));
jest.mock('../../src/middleware/autenticacao', () =>
  require('../helpers/mocks').criarModuloAutenticacao('coord-id', 'coordenador', 'coord@test.com', 'Coordenador Teste', 'curso-1', ['curso-1'])
);
jest.mock('../../src/middleware/autorizacao', () =>
  require('../helpers/mocks').moduloAutorizacao
);

import * as repositorio from '../../src/modulos/validacao/repositorio';
import * as repositorioDoc from '../../src/modulos/documentos/repositorio';
import { barramento } from '../../src/eventos/barramento';
import router from '../../src/modulos/validacao/rotas';
import { criarApp } from '../helpers/app';
import { DOC_MOCK } from '../helpers/fixtures';

const mockRepo = repositorio as jest.Mocked<typeof repositorio>;
const mockDoc = repositorioDoc as jest.Mocked<typeof repositorioDoc>;
const mockEmitir = barramento.emitir as jest.Mock;

const app = criarApp(router);

const RESULTADO_MOCK = {
  documento: { ...DOC_MOCK, status: 'aprovado', coordenador_id: 'coord-id' },
  historico: {
    id: 'hist-1',
    documento_id: 'doc-1',
    usuario_id: 'coord-id',
    status_anterior: 'pendente',
    status_novo: 'aprovado',
    observacoes: null,
    metadados: null,
    ocorrido_em: new Date(),
  },
};

describe('PATCH /:id/aprovar', () => {
  beforeEach(() => { jest.resetAllMocks(); mockEmitir.mockReset(); });

  it('retorna 200 ao aprovar um documento com sucesso', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockRepo.executarAcao.mockResolvedValueOnce(RESULTADO_MOCK as any);
    const res = await request(app).patch('/doc-1/aprovar').send({ observacoes: 'Documentação completa' });
    expect(res.status).toBe(200);
    expect(res.body.documento.status).toBe('aprovado');
    expect(mockEmitir).toHaveBeenCalledWith(
      'documento_aprovado',
      expect.objectContaining({
        documentoId: 'doc-1',
        coordenadorId: 'coord-id',
        estudanteId: RESULTADO_MOCK.documento.estudante_id,
        titulo: RESULTADO_MOCK.documento.titulo,
      }),
    );
  });

  it('retorna 200 ao aprovar sem observacoes (campo opcional)', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockRepo.executarAcao.mockResolvedValueOnce(RESULTADO_MOCK as any);
    const res = await request(app).patch('/doc-1/aprovar').send({});
    expect(res.status).toBe(200);
  });

  it('retorna 404 quando o documento não existe ou está cancelado', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockRepo.executarAcao.mockRejectedValueOnce(new Error('Documento não encontrado ou cancelado'));
    const res = await request(app).patch('/doc-inexistente/aprovar').send({});
    expect(res.status).toBe(404);
  });

  it('retorna 500 em caso de erro inesperado', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockRepo.executarAcao.mockRejectedValueOnce(new Error('Falha na transação'));
    const res = await request(app).patch('/doc-1/aprovar').send({});
    expect(res.status).toBe(500);
  });
});

describe('PATCH /:id/reprovar', () => {
  beforeEach(() => { jest.resetAllMocks(); mockEmitir.mockReset(); });

  it('retorna 400 quando observacoes não são enviadas', async () => {
    const res = await request(app).patch('/doc-1/reprovar').send({});
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Observações');
  });

  it('retorna 200 ao reprovar com observacoes e emite evento documento_reprovado', async () => {
    const resultadoReprovado = {
      ...RESULTADO_MOCK,
      documento: { ...RESULTADO_MOCK.documento, status: 'reprovado' },
      historico: { ...RESULTADO_MOCK.historico, status_novo: 'reprovado' },
    };
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockRepo.executarAcao.mockResolvedValueOnce(resultadoReprovado as any);
    const res = await request(app).patch('/doc-1/reprovar').send({ observacoes: 'Documentação incompleta' });
    expect(res.status).toBe(200);
    expect(res.body.documento.status).toBe('reprovado');
    expect(mockEmitir).toHaveBeenCalledWith(
      'documento_reprovado',
      expect.objectContaining({
        documentoId: 'doc-1',
        coordenadorId: 'coord-id',
        observacoes: 'Documentação incompleta',
      }),
    );
  });

  it('não emite evento quando reprovar retorna 400 por falta de observacoes', async () => {
    await request(app).patch('/doc-1/reprovar').send({});
    expect(mockEmitir).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o documento não é encontrado', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockRepo.executarAcao.mockRejectedValueOnce(new Error('Documento não encontrado ou cancelado'));
    const res = await request(app).patch('/doc-1/reprovar').send({ observacoes: 'Motivo' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /:id/solicitar-revisao', () => {
  beforeEach(() => { jest.resetAllMocks(); mockEmitir.mockReset(); });

  it('retorna 400 quando observacoes não são enviadas', async () => {
    const res = await request(app).patch('/doc-1/solicitar-revisao').send({});
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Observações');
  });

  it('retorna 200 ao solicitar revisão e emite evento documento_revisao_solicitada', async () => {
    const resultadoRevisao = {
      ...RESULTADO_MOCK,
      documento: { ...RESULTADO_MOCK.documento, status: 'revisao_solicitada' },
    };
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockRepo.executarAcao.mockResolvedValueOnce(resultadoRevisao as any);
    const res = await request(app)
      .patch('/doc-1/solicitar-revisao')
      .send({ observacoes: 'Revisar a seção de carga horária' });
    expect(res.status).toBe(200);
    expect(mockEmitir).toHaveBeenCalledWith(
      'documento_revisao_solicitada',
      expect.objectContaining({
        documentoId: 'doc-1',
        coordenadorId: 'coord-id',
        observacoes: 'Revisar a seção de carga horária',
      }),
    );
  });

  it('não emite evento quando solicitar-revisao retorna 400 por falta de observacoes', async () => {
    await request(app).patch('/doc-1/solicitar-revisao').send({});
    expect(mockEmitir).not.toHaveBeenCalled();
  });
});

describe('GET /:id/historico', () => {
  beforeEach(() => jest.resetAllMocks());

  it('retorna 200 com o histórico do documento', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockRepo.buscarHistoricoPorDocumento.mockResolvedValueOnce([RESULTADO_MOCK.historico as any]);
    const res = await request(app).get('/doc-1/historico');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it('retorna 200 com lista vazia quando não há histórico', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockRepo.buscarHistoricoPorDocumento.mockResolvedValueOnce([]);
    const res = await request(app).get('/doc-1/historico');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('retorna 404 quando o documento não existe', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(null);
    const res = await request(app).get('/nao-existe/historico');
    expect(res.status).toBe(404);
  });

  it('retorna 200 quando coordenador acessa histórico de documento de outro estudante', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce({ ...DOC_MOCK, estudante_id: 'outro-id' });
    mockRepo.buscarHistoricoPorDocumento.mockResolvedValueOnce([]);
    const res = await request(app).get('/doc-1/historico');
    expect(res.status).toBe(200);
  });
});
