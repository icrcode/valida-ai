import request from 'supertest';

jest.mock('../../src/modulos/instituicoes/repositorio');
jest.mock('../../src/middleware/autenticacao', () =>
  require('../helpers/mocks').criarModuloAutenticacao('admin-id', 'admin', 'admin@test.com', 'Admin Teste')
);
jest.mock('../../src/middleware/autorizacao', () =>
  require('../helpers/mocks').moduloAutorizacao
);

import * as repositorio from '../../src/modulos/instituicoes/repositorio';
import router from '../../src/modulos/instituicoes/rotas';
import { criarApp } from '../helpers/app';

const mockRepo = repositorio as jest.Mocked<typeof repositorio>;
const app = criarApp(router);

const INST_MOCK: repositorio.Instituicao = {
  id: 'inst-1',
  nome: 'Universidade Teste',
  sigla: 'UT',
  cnpj: null,
  email_contato: null,
  telefone: null,
  site: null,
  endereco: null,
  cidade: null,
  estado: null,
  dominios_email: [],
  ativa: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
};

describe('GET /', () => {
  beforeEach(() => jest.resetAllMocks());

  it('retorna 200 com a lista de instituições', async () => {
    mockRepo.listarInstituicoes.mockResolvedValueOnce([INST_MOCK]);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].sigla).toBe('UT');
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockRepo.listarInstituicoes.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/');
    expect(res.status).toBe(500);
  });
});

describe('GET /:id', () => {
  beforeEach(() => jest.resetAllMocks());

  it('retorna 200 com a instituição encontrada', async () => {
    mockRepo.buscarInstituicaoPorId.mockResolvedValueOnce(INST_MOCK);
    const res = await request(app).get('/inst-1');
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Universidade Teste');
  });

  it('retorna 404 quando não encontrada', async () => {
    mockRepo.buscarInstituicaoPorId.mockResolvedValueOnce(null);
    const res = await request(app).get('/nao-existe');
    expect(res.status).toBe(404);
  });

  it('retorna 500 em caso de erro', async () => {
    mockRepo.buscarInstituicaoPorId.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/inst-1');
    expect(res.status).toBe(500);
  });
});

describe('POST /', () => {
  beforeEach(() => jest.resetAllMocks());

  it('retorna 400 quando nome é muito curto', async () => {
    const res = await request(app).post('/').send({ nome: 'A', sigla: 'UT' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Nome inválido');
  });

  it('retorna 400 quando sigla é muito curta', async () => {
    const res = await request(app).post('/').send({ nome: 'Universidade', sigla: 'U' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Sigla inválida');
  });

  it('retorna 400 quando dominios_email não é array', async () => {
    const res = await request(app).post('/').send({ nome: 'Univ', sigla: 'UV', dominios_email: 'nao-array' });
    expect(res.status).toBe(400);
  });

  it('retorna 409 quando sigla já existe', async () => {
    mockRepo.buscarInstituicaoPorSigla.mockResolvedValueOnce(INST_MOCK);
    const res = await request(app).post('/').send({ nome: 'Outra Univ', sigla: 'UT' });
    expect(res.status).toBe(409);
  });

  it('retorna 201 com instituição criada', async () => {
    mockRepo.buscarInstituicaoPorSigla.mockResolvedValueOnce(null);
    mockRepo.criarInstituicao.mockResolvedValueOnce(INST_MOCK);
    const res = await request(app).post('/').send({ nome: 'Universidade Teste', sigla: 'UT' });
    expect(res.status).toBe(201);
    expect(res.body.sigla).toBe('UT');
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockRepo.buscarInstituicaoPorSigla.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).post('/').send({ nome: 'Universidade Teste', sigla: 'UT' });
    expect(res.status).toBe(500);
  });
});

describe('PUT /:id', () => {
  beforeEach(() => jest.resetAllMocks());

  it('retorna 400 quando nome é muito curto', async () => {
    const res = await request(app).put('/inst-1').send({ nome: 'A' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando sigla é muito curta', async () => {
    const res = await request(app).put('/inst-1').send({ sigla: 'U' });
    expect(res.status).toBe(400);
  });

  it('retorna 200 com instituição atualizada', async () => {
    mockRepo.atualizarInstituicao.mockResolvedValueOnce({ ...INST_MOCK, nome: 'Novo Nome' });
    const res = await request(app).put('/inst-1').send({ nome: 'Novo Nome' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Novo Nome');
  });

  it('retorna 404 quando não encontrada', async () => {
    mockRepo.atualizarInstituicao.mockResolvedValueOnce(null);
    const res = await request(app).put('/inst-1').send({ nome: 'Nome Válido' });
    expect(res.status).toBe(404);
  });

  it('retorna 500 em caso de erro', async () => {
    mockRepo.atualizarInstituicao.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).put('/inst-1').send({ nome: 'Nome Válido' });
    expect(res.status).toBe(500);
  });
});

describe('PATCH /:id/ativa', () => {
  beforeEach(() => jest.resetAllMocks());

  it('retorna 400 quando ativa não é boolean', async () => {
    const res = await request(app).patch('/inst-1/ativa').send({ ativa: 'true' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('boolean');
  });

  it('retorna 200 ao desativar instituição', async () => {
    mockRepo.alterarAtiva.mockResolvedValueOnce({ ...INST_MOCK, ativa: false });
    const res = await request(app).patch('/inst-1/ativa').send({ ativa: false });
    expect(res.status).toBe(200);
    expect(res.body.ativa).toBe(false);
  });

  it('retorna 404 quando não encontrada', async () => {
    mockRepo.alterarAtiva.mockResolvedValueOnce(null);
    const res = await request(app).patch('/inst-1/ativa').send({ ativa: true });
    expect(res.status).toBe(404);
  });

  it('retorna 500 em caso de erro', async () => {
    mockRepo.alterarAtiva.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).patch('/inst-1/ativa').send({ ativa: true });
    expect(res.status).toBe(500);
  });
});
