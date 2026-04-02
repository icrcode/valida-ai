import express from 'express';
import request from 'supertest';

jest.mock('../../src/modulos/usuarios/repositorio');
jest.mock('../../src/middleware/autenticacao', () => ({
  autenticar: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as any).usuario = {
      sub: 'usuario-id',
      perfil: 'estudante',
      email: 'est@test.com',
      nome: 'Estudante Teste',
    };
    next();
  },
}));
jest.mock('../../src/middleware/autorizacao', () => ({
  exigirPerfil: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

import * as repositorio from '../../src/modulos/usuarios/repositorio';
import router from '../../src/modulos/usuarios/rotas';

const mockRepo = repositorio as jest.Mocked<typeof repositorio>;

const app = express();
app.use(express.json());
app.use('/', router);

const USUARIO_MOCK = {
  id: 'usuario-id',
  nome: 'João Silva',
  email: 'joao@email.com',
  matricula: '2021001',
  perfil: 'estudante' as const,
  curso_id: 'curso-1',
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
};

describe('GET /perfil', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 com os dados do usuário logado', async () => {
    mockRepo.buscarPorId.mockResolvedValueOnce(USUARIO_MOCK);
    const res = await request(app).get('/perfil');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('joao@email.com');
  });

  it('retorna 404 quando o usuário não é encontrado', async () => {
    mockRepo.buscarPorId.mockResolvedValueOnce(null);
    const res = await request(app).get('/perfil');
    expect(res.status).toBe(404);
    expect(res.body.erro).toContain('não encontrado');
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockRepo.buscarPorId.mockRejectedValueOnce(new Error('Falha no banco'));
    const res = await request(app).get('/perfil');
    expect(res.status).toBe(500);
  });
});

describe('PUT /perfil', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 com nome muito curto (menos de 2 caracteres)', async () => {
    const res = await request(app).put('/perfil').send({ nome: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Nome inválido');
  });

  it('retorna 400 sem campo nome', async () => {
    const res = await request(app).put('/perfil').send({});
    expect(res.status).toBe(400);
  });

  it('retorna 200 e os dados atualizados com nome válido', async () => {
    mockRepo.atualizarNome.mockResolvedValueOnce({ ...USUARIO_MOCK, nome: 'João Atualizado' });
    const res = await request(app).put('/perfil').send({ nome: 'João Atualizado' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('João Atualizado');
  });

  it('retorna 404 quando usuário não existe ao atualizar', async () => {
    mockRepo.atualizarNome.mockResolvedValueOnce(null);
    const res = await request(app).put('/perfil').send({ nome: 'Nome Válido' });
    expect(res.status).toBe(404);
  });
});

describe('GET /', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 com a lista de todos os usuários', async () => {
    mockRepo.listarTodos.mockResolvedValueOnce([USUARIO_MOCK]);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it('retorna 200 com lista vazia quando não há usuários', async () => {
    mockRepo.listarTodos.mockResolvedValueOnce([]);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
