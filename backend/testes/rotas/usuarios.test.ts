import request from 'supertest';

jest.mock('../../src/modulos/usuarios/repositorio');
jest.mock('../../src/middleware/autenticacao', () =>
  require('../helpers/mocks').criarModuloAutenticacao('usuario-id', 'estudante', 'est@test.com', 'Estudante Teste')
);
jest.mock('../../src/middleware/autorizacao', () =>
  require('../helpers/mocks').moduloAutorizacao
);
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('$2b$10$hashed') }));

import * as repositorio from '../../src/modulos/usuarios/repositorio';
import router from '../../src/modulos/usuarios/rotas';
import { criarApp } from '../helpers/app';

const mockRepo = repositorio as jest.Mocked<typeof repositorio>;
const app = criarApp(router);

const USUARIO_MOCK = {
  id: 'usuario-id',
  nome: 'João Silva',
  email: 'joao@email.com',
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

  it('retorna 200 e os dados atualizados com nome válido', async () => {
    mockRepo.atualizarPerfil.mockResolvedValueOnce({ ...USUARIO_MOCK, nome: 'João Atualizado' });
    const res = await request(app).put('/perfil').send({ nome: 'João Atualizado' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('João Atualizado');
  });

  it('retorna 404 quando usuário não existe ao atualizar', async () => {
    mockRepo.atualizarPerfil.mockResolvedValueOnce(null);
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

describe('POST /', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 quando nome é muito curto', async () => {
    const res = await request(app).post('/').send({ nome: 'A', email: 'a@b.com', perfil: 'estudante' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Nome inválido');
  });

  it('retorna 400 quando email é inválido', async () => {
    const res = await request(app).post('/').send({ nome: 'João', email: 'invalido', perfil: 'estudante' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('E-mail inválido');
  });

  it('retorna 400 quando senha está ausente ou é muito curta', async () => {
    const res = await request(app).post('/').send({ nome: 'João', email: 'a@b.com', senha: '123', perfil: 'estudante' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Senha inválida');
  });

  it('retorna 400 quando perfil é inválido', async () => {
    const res = await request(app).post('/').send({ nome: 'João', email: 'a@b.com', senha: 'senha123', perfil: 'superadmin' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Perfil inválido');
  });

  it('retorna 409 quando e-mail já está cadastrado', async () => {
    mockRepo.buscarPorEmail.mockResolvedValueOnce(USUARIO_MOCK);
    const res = await request(app).post('/').send({ nome: 'João', email: 'joao@email.com', senha: 'senha123', perfil: 'estudante' });
    expect(res.status).toBe(409);
  });

  it('retorna 201 com usuário criado', async () => {
    mockRepo.buscarPorEmail.mockResolvedValueOnce(null);
    mockRepo.criarUsuario.mockResolvedValueOnce(USUARIO_MOCK);
    const res = await request(app).post('/').send({
      nome: 'João', email: 'novo@email.com', senha: 'senha123', perfil: 'estudante', matricula: '2021001', curso_id: 'curso-1',
    });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('joao@email.com');
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockRepo.buscarPorEmail.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).post('/').send({ nome: 'João', email: 'a@b.com', senha: 'senha123', perfil: 'estudante' });
    expect(res.status).toBe(500);
  });
});

describe('PUT /:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 quando nome é muito curto', async () => {
    const res = await request(app).put('/algum-id').send({ nome: 'A' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando perfil é inválido', async () => {
    const res = await request(app).put('/algum-id').send({ nome: 'João', perfil: 'invalido' });
    expect(res.status).toBe(400);
  });

  it('retorna 200 com usuário atualizado', async () => {
    mockRepo.atualizarUsuario.mockResolvedValueOnce({ ...USUARIO_MOCK, nome: 'Novo Nome' });
    const res = await request(app).put('/algum-id').send({ nome: 'Novo Nome', perfil: 'coordenador' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Novo Nome');
  });

  it('retorna 404 quando usuário não é encontrado', async () => {
    mockRepo.atualizarUsuario.mockResolvedValueOnce(null);
    const res = await request(app).put('/algum-id').send({ nome: 'Nome Válido' });
    expect(res.status).toBe(404);
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockRepo.atualizarUsuario.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).put('/algum-id').send({ nome: 'Nome Válido' });
    expect(res.status).toBe(500);
  });
});

describe('PATCH /:id/ativo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 quando ativo não é boolean', async () => {
    const res = await request(app).patch('/outro-id/ativo').send({ ativo: 'true' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('boolean');
  });

  it('retorna 400 quando admin tenta desativar a própria conta', async () => {
    // usuario-id é o sub do usuário autenticado (definido em criarModuloAutenticacao)
    const res = await request(app).patch('/usuario-id/ativo').send({ ativo: false });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('própria conta');
  });

  it('retorna 200 ao desativar outro usuário', async () => {
    mockRepo.alterarAtivo.mockResolvedValueOnce({ ...USUARIO_MOCK, id: 'outro-id', ativo: false });
    const res = await request(app).patch('/outro-id/ativo').send({ ativo: false });
    expect(res.status).toBe(200);
    expect(res.body.ativo).toBe(false);
  });

  it('retorna 200 ao ativar usuário', async () => {
    mockRepo.alterarAtivo.mockResolvedValueOnce({ ...USUARIO_MOCK, id: 'outro-id', ativo: true });
    const res = await request(app).patch('/outro-id/ativo').send({ ativo: true });
    expect(res.status).toBe(200);
    expect(res.body.ativo).toBe(true);
  });

  it('retorna 404 quando usuário não é encontrado', async () => {
    mockRepo.alterarAtivo.mockResolvedValueOnce(null);
    const res = await request(app).patch('/outro-id/ativo').send({ ativo: true });
    expect(res.status).toBe(404);
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockRepo.alterarAtivo.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).patch('/outro-id/ativo').send({ ativo: true });
    expect(res.status).toBe(500);
  });
});
