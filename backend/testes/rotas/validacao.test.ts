import request from 'supertest';

jest.mock('../../src/modulos/validacao/repositorio');
jest.mock('../../src/modulos/documentos/repositorio');
jest.mock('../../src/middleware/autenticacao', () =>
  require('../helpers/mocks').criarModuloAutenticacao('coord-id', 'coordenador', 'coord@test.com', 'Coordenador Teste')
);
jest.mock('../../src/middleware/autorizacao', () =>
  require('../helpers/mocks').moduloAutorizacao
);

import * as repositorio from '../../src/modulos/validacao/repositorio';
import * as repositorioDoc from '../../src/modulos/documentos/repositorio';
import router from '../../src/modulos/validacao/rotas';
import { criarApp } from '../helpers/app';
import { DOC_MOCK } from '../helpers/fixtures';

const mockRepo = repositorio as jest.Mocked<typeof repositorio>;
const mockDoc = repositorioDoc as jest.Mocked<typeof repositorioDoc>;

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
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 ao aprovar um documento com sucesso', async () => {
    mockRepo.executarAcao.mockResolvedValueOnce(RESULTADO_MOCK as any);
    const res = await request(app).patch('/doc-1/aprovar').send({ observacoes: 'Documentação completa' });
    expect(res.status).toBe(200);
    expect(res.body.documento.status).toBe('aprovado');
  });

  it('retorna 200 ao aprovar sem observacoes (campo opcional)', async () => {
    mockRepo.executarAcao.mockResolvedValueOnce(RESULTADO_MOCK as any);
    const res = await request(app).patch('/doc-1/aprovar').send({});
    expect(res.status).toBe(200);
  });

  it('retorna 404 quando o documento não existe ou está cancelado', async () => {
    mockRepo.executarAcao.mockRejectedValueOnce(new Error('Documento não encontrado ou cancelado'));
    const res = await request(app).patch('/doc-inexistente/aprovar').send({});
    expect(res.status).toBe(404);
  });

  it('retorna 500 em caso de erro inesperado', async () => {
    mockRepo.executarAcao.mockRejectedValueOnce(new Error('Falha na transação'));
    const res = await request(app).patch('/doc-1/aprovar').send({});
    expect(res.status).toBe(500);
  });
});

describe('PATCH /:id/reprovar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 quando observacoes não são enviadas', async () => {
    const res = await request(app).patch('/doc-1/reprovar').send({});
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Observações');
  });

  it('retorna 200 ao reprovar com observacoes', async () => {
    const resultadoReprovado = {
      ...RESULTADO_MOCK,
      documento: { ...RESULTADO_MOCK.documento, status: 'reprovado' },
      historico: { ...RESULTADO_MOCK.historico, status_novo: 'reprovado' },
    };
    mockRepo.executarAcao.mockResolvedValueOnce(resultadoReprovado as any);
    const res = await request(app).patch('/doc-1/reprovar').send({ observacoes: 'Documentação incompleta' });
    expect(res.status).toBe(200);
    expect(res.body.documento.status).toBe('reprovado');
  });

  it('retorna 404 quando o documento não é encontrado', async () => {
    mockRepo.executarAcao.mockRejectedValueOnce(new Error('Documento não encontrado ou cancelado'));
    const res = await request(app).patch('/doc-1/reprovar').send({ observacoes: 'Motivo' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /:id/solicitar-revisao', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 quando observacoes não são enviadas', async () => {
    const res = await request(app).patch('/doc-1/solicitar-revisao').send({});
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Observações');
  });

  it('retorna 200 ao solicitar revisão com observacoes', async () => {
    const resultadoRevisao = {
      ...RESULTADO_MOCK,
      documento: { ...RESULTADO_MOCK.documento, status: 'revisao_solicitada' },
    };
    mockRepo.executarAcao.mockResolvedValueOnce(resultadoRevisao as any);
    const res = await request(app)
      .patch('/doc-1/solicitar-revisao')
      .send({ observacoes: 'Revisar a seção de carga horária' });
    expect(res.status).toBe(200);
  });
});

describe('GET /:id/historico', () => {
  beforeEach(() => jest.clearAllMocks());

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
