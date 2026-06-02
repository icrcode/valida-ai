import request from 'supertest';

jest.mock('../../src/modulos/cursos/repositorio');
jest.mock('../../src/modulos/instituicoes/repositorio');
jest.mock('../../src/middleware/autenticacao', () =>
  require('../helpers/mocks').criarModuloAutenticacao('admin-id', 'admin', 'admin@test.com', 'Admin Teste')
);
jest.mock('../../src/middleware/autorizacao', () =>
  require('../helpers/mocks').moduloAutorizacao
);

import * as repositorio from '../../src/modulos/cursos/repositorio';
import * as repoInst from '../../src/modulos/instituicoes/repositorio';
import router from '../../src/modulos/cursos/rotas';
import { criarApp } from '../helpers/app';

const mockRepo = repositorio as jest.Mocked<typeof repositorio>;
const mockInst = repoInst as jest.Mocked<typeof repoInst>;
const app = criarApp(router);

const CURSO_MOCK: repositorio.CursoComDominios = {
  id: 'curso-1',
  nome: 'Ciência da Computação',
  codigo: 'UT001',
  carga_horaria_complementar: 200,
  turno: 'noturno',
  modalidade: 'presencial',
  instituicao_id: 'inst-1',
  instituicao_nome: 'Universidade Teste',
  instituicao_sigla: 'UT',
  dominios_email: ['ut.edu.br'],
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
};

const INST_MOCK = { id: 'inst-1', nome: 'Universidade Teste' } as repoInst.Instituicao;

describe('GET /admin', () => {
  beforeEach(() => jest.resetAllMocks());

  it('retorna 200 com lista de cursos', async () => {
    mockRepo.listarCursos.mockResolvedValueOnce([{ ...CURSO_MOCK, total_estudantes: 5 }] as repositorio.CursoComContagem[]);
    const res = await request(app).get('/admin');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('retorna 500 em caso de erro', async () => {
    mockRepo.listarCursos.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/admin');
    expect(res.status).toBe(500);
  });
});

describe('GET /:id', () => {
  beforeEach(() => jest.resetAllMocks());

  it('retorna 200 com o curso encontrado', async () => {
    mockRepo.buscarCursoPorId.mockResolvedValueOnce(CURSO_MOCK);
    const res = await request(app).get('/curso-1');
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Ciência da Computação');
  });

  it('retorna 404 quando não encontrado', async () => {
    mockRepo.buscarCursoPorId.mockResolvedValueOnce(null);
    const res = await request(app).get('/nao-existe');
    expect(res.status).toBe(404);
  });

  it('retorna 500 em caso de erro', async () => {
    mockRepo.buscarCursoPorId.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/curso-1');
    expect(res.status).toBe(500);
  });
});

describe('POST /', () => {
  beforeEach(() => jest.resetAllMocks());

  it('retorna 400 quando nome é muito curto', async () => {
    const res = await request(app).post('/').send({ nome: 'A', instituicao_id: 'inst-1' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Nome inválido');
  });

  it('retorna 400 quando instituicao_id está ausente', async () => {
    const res = await request(app).post('/').send({ nome: 'Curso Válido' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Instituição obrigatória');
  });

  it('retorna 400 quando turno é inválido', async () => {
    const res = await request(app).post('/').send({ nome: 'Curso', instituicao_id: 'inst-1', turno: 'invalido' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Turno inválido');
  });

  it('retorna 400 quando modalidade é inválida', async () => {
    const res = await request(app).post('/').send({ nome: 'Curso', instituicao_id: 'inst-1', modalidade: 'invalida' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Modalidade inválida');
  });

  it('retorna 400 quando carga horária é inválida', async () => {
    const res = await request(app).post('/').send({ nome: 'Curso', instituicao_id: 'inst-1', carga_horaria_complementar: -10 });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Carga horária');
  });

  it('retorna 400 quando instituição não existe', async () => {
    mockInst.buscarInstituicaoPorId.mockResolvedValueOnce(null);
    const res = await request(app).post('/').send({ nome: 'Curso Válido', instituicao_id: 'inst-x' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Instituição não encontrada');
  });

  it('retorna 201 com curso criado', async () => {
    mockInst.buscarInstituicaoPorId.mockResolvedValueOnce(INST_MOCK);
    mockRepo.criarCurso.mockResolvedValueOnce(CURSO_MOCK);
    const res = await request(app).post('/').send({ nome: 'Ciência da Computação', instituicao_id: 'inst-1' });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Ciência da Computação');
  });

  it('retorna 500 em caso de erro', async () => {
    mockInst.buscarInstituicaoPorId.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).post('/').send({ nome: 'Curso Válido', instituicao_id: 'inst-1' });
    expect(res.status).toBe(500);
  });
});

describe('PUT /:id', () => {
  beforeEach(() => jest.resetAllMocks());

  it('retorna 400 quando nome é muito curto', async () => {
    const res = await request(app).put('/curso-1').send({ nome: 'A' });
    expect(res.status).toBe(400);
  });

  it('retorna 200 com curso atualizado', async () => {
    mockRepo.atualizarCurso.mockResolvedValueOnce({ ...CURSO_MOCK, nome: 'Novo Nome' });
    const res = await request(app).put('/curso-1').send({ nome: 'Novo Nome' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Novo Nome');
  });

  it('retorna 400 quando instituicao_id fornecido não existe', async () => {
    mockInst.buscarInstituicaoPorId.mockResolvedValueOnce(null);
    const res = await request(app).put('/curso-1').send({ nome: 'Curso', instituicao_id: 'inst-x' });
    expect(res.status).toBe(400);
  });

  it('retorna 404 quando curso não encontrado', async () => {
    mockRepo.atualizarCurso.mockResolvedValueOnce(null);
    const res = await request(app).put('/curso-1').send({ nome: 'Curso Válido' });
    expect(res.status).toBe(404);
  });

  it('retorna 500 em caso de erro', async () => {
    mockRepo.atualizarCurso.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).put('/curso-1').send({ nome: 'Curso Válido' });
    expect(res.status).toBe(500);
  });
});

describe('PATCH /:id/ativo', () => {
  beforeEach(() => jest.resetAllMocks());

  it('retorna 400 quando ativo não é boolean', async () => {
    const res = await request(app).patch('/curso-1/ativo').send({ ativo: 'true' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('boolean');
  });

  it('retorna 200 ao desativar curso', async () => {
    mockRepo.alterarAtivo.mockResolvedValueOnce({ ...CURSO_MOCK, ativo: false });
    const res = await request(app).patch('/curso-1/ativo').send({ ativo: false });
    expect(res.status).toBe(200);
    expect(res.body.ativo).toBe(false);
  });

  it('retorna 404 quando curso não encontrado', async () => {
    mockRepo.alterarAtivo.mockResolvedValueOnce(null);
    const res = await request(app).patch('/curso-1/ativo').send({ ativo: true });
    expect(res.status).toBe(404);
  });

  it('retorna 500 em caso de erro', async () => {
    mockRepo.alterarAtivo.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).patch('/curso-1/ativo').send({ ativo: true });
    expect(res.status).toBe(500);
  });
});
