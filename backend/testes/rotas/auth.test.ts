import request from 'supertest';

jest.mock('../../src/modulos/usuarios/repositorio');
jest.mock('../../src/modulos/cursos/repositorio');
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import * as usuariosRepo from '../../src/modulos/usuarios/repositorio';
import * as cursosRepo from '../../src/modulos/cursos/repositorio';
import bcrypt from 'bcryptjs';
import router from '../../src/modulos/auth/rotas';
import { criarApp } from '../helpers/app';

const mockUsuarios = usuariosRepo as jest.Mocked<typeof usuariosRepo>;
const mockCursos = cursosRepo as jest.Mocked<typeof cursosRepo>;
const mockBcryptCompare = bcrypt.compare as jest.Mock;
const mockBcryptHash = bcrypt.hash as jest.Mock;
const app = criarApp(router);

const USUARIO_LOGIN_MOCK: usuariosRepo.UsuarioParaLogin = {
  id: 'usr-1',
  nome: 'João Silva',
  email: 'joao@uni.edu',
  matricula: '2021001',
  perfil: 'estudante',
  curso_id: 'curso-1',
  instituicao_id: 'inst-1',
  instituicao_nome: 'Universidade Teste',
  senha_hash: '$2b$10$hashqualquer',
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
  dominios_email: null,
};

const CURSO_MOCK: cursosRepo.CursoComDominios = {
  id: 'curso-1',
  nome: 'Ciência da Computação',
  codigo: 'CC001',
  carga_horaria_complementar: 200,
  turno: null,
  modalidade: null,
  instituicao_id: 'inst-1',
  instituicao_nome: 'Universidade Teste',
  instituicao_sigla: 'UT',
  dominios_email: null,
};

const USUARIO_CRIADO: usuariosRepo.Usuario = {
  id: 'usr-novo',
  nome: 'Maria Silva',
  email: 'maria@uni.edu',
  matricula: '2021002',
  perfil: 'estudante',
  curso_id: 'curso-1',
  instituicao_id: 'inst-1',
  instituicao_nome: 'Universidade Teste',
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
};

const DADOS_LOGIN = { email: 'joao@uni.edu', senha: 'senha123' };
const DADOS_CADASTRO = {
  nome: 'Maria Silva',
  email: 'maria@uni.edu',
  senha: 'senha123',
  matricula: '2021002',
  curso_id: 'curso-1',
};

// ─────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────
describe('POST /login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 quando email não é enviado', async () => {
    const res = await request(app).post('/login').send({ senha: 'abc123' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('E-mail');
  });

  it('retorna 400 quando senha não é enviada', async () => {
    const res = await request(app).post('/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Senha');
  });

  it('retorna 400 quando email não contém @', async () => {
    const res = await request(app).post('/login').send({ email: 'invalido', senha: '123456' });
    expect(res.status).toBe(400);
  });

  it('retorna 401 quando usuário não é encontrado', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce(null);
    const res = await request(app).post('/login').send(DADOS_LOGIN);
    expect(res.status).toBe(401);
  });

  it('retorna 401 quando conta não tem senha configurada', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce({
      ...USUARIO_LOGIN_MOCK,
      senha_hash: '',
    });
    const res = await request(app).post('/login').send(DADOS_LOGIN);
    expect(res.status).toBe(401);
    expect(res.body.erro).toContain('senha');
  });

  it('retorna 401 quando senha está incorreta', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce(USUARIO_LOGIN_MOCK);
    mockBcryptCompare.mockResolvedValueOnce(false);
    const res = await request(app).post('/login').send(DADOS_LOGIN);
    expect(res.status).toBe(401);
  });

  it('retorna 403 quando domínio do e-mail não é aceito pela instituição', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce({
      ...USUARIO_LOGIN_MOCK,
      dominios_email: ['outra.edu.br'],
    });
    mockBcryptCompare.mockResolvedValueOnce(true);
    const res = await request(app).post('/login').send(DADOS_LOGIN);
    expect(res.status).toBe(403);
    expect(res.body.erro).toContain('Domínio');
  });

  it('retorna 200 com token quando login é bem-sucedido (sem restrição de domínio)', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce(USUARIO_LOGIN_MOCK);
    mockBcryptCompare.mockResolvedValueOnce(true);
    const res = await request(app).post('/login').send(DADOS_LOGIN);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.email).toBe('joao@uni.edu');
    expect(res.body.usuario.perfil).toBe('estudante');
  });

  it('retorna 200 quando domínio é aceito pela instituição', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce({
      ...USUARIO_LOGIN_MOCK,
      dominios_email: ['uni.edu'],
    });
    mockBcryptCompare.mockResolvedValueOnce(true);
    const res = await request(app).post('/login').send(DADOS_LOGIN);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('retorna 200 quando lista de domínios está vazia (sem restrição)', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce({
      ...USUARIO_LOGIN_MOCK,
      dominios_email: [],
    });
    mockBcryptCompare.mockResolvedValueOnce(true);
    const res = await request(app).post('/login').send(DADOS_LOGIN);
    expect(res.status).toBe(200);
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockRejectedValueOnce(new Error('DB indisponível'));
    const res = await request(app).post('/login').send(DADOS_LOGIN);
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────
// POST /cadastro
// ─────────────────────────────────────────────
describe('POST /cadastro', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 quando nome não é enviado', async () => {
    const res = await request(app).post('/cadastro').send({ ...DADOS_CADASTRO, nome: undefined });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando nome tem menos de 2 caracteres', async () => {
    const res = await request(app).post('/cadastro').send({ ...DADOS_CADASTRO, nome: 'A' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando email é inválido', async () => {
    const res = await request(app).post('/cadastro').send({ ...DADOS_CADASTRO, email: 'invalido' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando senha tem menos de 6 caracteres', async () => {
    const res = await request(app).post('/cadastro').send({ ...DADOS_CADASTRO, senha: '123' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('Senha');
  });

  it('retorna 400 quando matrícula não é enviada', async () => {
    const res = await request(app).post('/cadastro').send({ ...DADOS_CADASTRO, matricula: undefined });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando curso_id não é enviado', async () => {
    const res = await request(app).post('/cadastro').send({ ...DADOS_CADASTRO, curso_id: undefined });
    expect(res.status).toBe(400);
  });

  it('retorna 409 quando e-mail já está cadastrado', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce(USUARIO_CRIADO);
    const res = await request(app).post('/cadastro').send(DADOS_CADASTRO);
    expect(res.status).toBe(409);
    expect(res.body.erro).toContain('E-mail já cadastrado');
  });

  it('retorna 400 quando curso não é encontrado', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce(null);
    mockCursos.buscarCursoPorId.mockResolvedValueOnce(null);
    const res = await request(app).post('/cadastro').send(DADOS_CADASTRO);
    expect(res.status).toBe(400);
  });

  it('retorna 403 quando domínio do e-mail não é aceito pela instituição', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce(null);
    mockCursos.buscarCursoPorId.mockResolvedValueOnce({
      ...CURSO_MOCK,
      dominios_email: ['outra.edu.br'],
    });
    const res = await request(app).post('/cadastro').send(DADOS_CADASTRO);
    expect(res.status).toBe(403);
  });

  it('retorna 201 com token quando cadastro é bem-sucedido', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce(null);
    mockCursos.buscarCursoPorId.mockResolvedValueOnce(CURSO_MOCK);
    mockBcryptHash.mockResolvedValueOnce('$2b$10$hashed');
    mockUsuarios.criarUsuario.mockResolvedValueOnce(USUARIO_CRIADO);
    const res = await request(app).post('/cadastro').send(DADOS_CADASTRO);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.perfil).toBe('estudante');
    expect(res.body.usuario.email).toBe('maria@uni.edu');
  });

  it('retorna 201 quando instituição não tem restrição de domínio (lista vazia)', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce(null);
    mockCursos.buscarCursoPorId.mockResolvedValueOnce({ ...CURSO_MOCK, dominios_email: [] });
    mockBcryptHash.mockResolvedValueOnce('$2b$10$hashed');
    mockUsuarios.criarUsuario.mockResolvedValueOnce(USUARIO_CRIADO);
    const res = await request(app).post('/cadastro').send({ ...DADOS_CADASTRO, email: 'maria@qualquer.com' });
    expect(res.status).toBe(201);
  });

  it('retorna 201 quando domínio é aceito pela instituição', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce(null);
    mockCursos.buscarCursoPorId.mockResolvedValueOnce({ ...CURSO_MOCK, dominios_email: ['uni.edu'] });
    mockBcryptHash.mockResolvedValueOnce('$2b$10$hashed');
    mockUsuarios.criarUsuario.mockResolvedValueOnce(USUARIO_CRIADO);
    const res = await request(app).post('/cadastro').send(DADOS_CADASTRO);
    expect(res.status).toBe(201);
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockUsuarios.buscarPorEmail.mockRejectedValueOnce(new Error('DB indisponível'));
    const res = await request(app).post('/cadastro').send(DADOS_CADASTRO);
    expect(res.status).toBe(500);
  });
});
