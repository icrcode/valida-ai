import request from 'supertest';

jest.mock('../../src/modulos/usuarios/repositorio');
jest.mock('../../src/modulos/cursos/repositorio');

import * as usuariosRepo from '../../src/modulos/usuarios/repositorio';
import * as cursosRepo from '../../src/modulos/cursos/repositorio';
import router from '../../src/modulos/auth/rotas';
import { criarApp } from '../helpers/app';

const mockUsuarios = usuariosRepo as jest.Mocked<typeof usuariosRepo>;
const mockCursos = cursosRepo as jest.Mocked<typeof cursosRepo>;
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

// ─────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────
describe('POST /login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 quando email não é enviado', async () => {
    const res = await request(app).post('/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.erro).toBeDefined();
  });

  it('retorna 400 quando email não contém @', async () => {
    const res = await request(app).post('/login').send({ email: 'invalido' });
    expect(res.status).toBe(400);
  });

  it('retorna 401 quando usuário não é encontrado no banco', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce(null);
    const res = await request(app).post('/login').send({ email: 'nao@existe.com' });
    expect(res.status).toBe(401);
    expect(res.body.erro).toBeDefined();
  });

  it('retorna 403 quando domínio do e-mail não é aceito pela instituição', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce({
      ...USUARIO_LOGIN_MOCK,
      dominios_email: ['outrodominio.edu.br'],
    });
    const res = await request(app).post('/login').send({ email: 'joao@uni.edu' });
    expect(res.status).toBe(403);
    expect(res.body.erro).toContain('Domínio');
  });

  it('retorna 200 com token e dados quando login é bem-sucedido sem restrição de domínio', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce(USUARIO_LOGIN_MOCK);
    const res = await request(app).post('/login').send({ email: 'joao@uni.edu' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.email).toBe('joao@uni.edu');
    expect(res.body.usuario.perfil).toBe('estudante');
  });

  it('retorna 200 quando domínio é aceito pela lista da instituição', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce({
      ...USUARIO_LOGIN_MOCK,
      dominios_email: ['uni.edu'],
    });
    const res = await request(app).post('/login').send({ email: 'joao@uni.edu' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('retorna 200 quando a lista de domínios está vazia (sem restrição)', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockResolvedValueOnce({
      ...USUARIO_LOGIN_MOCK,
      dominios_email: [],
    });
    const res = await request(app).post('/login').send({ email: 'joao@qualquer.com' });
    expect(res.status).toBe(200);
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockUsuarios.buscarPorEmailParaLogin.mockRejectedValueOnce(new Error('DB indisponível'));
    const res = await request(app).post('/login').send({ email: 'joao@uni.edu' });
    expect(res.status).toBe(500);
    expect(res.body.erro).toBe('Erro interno');
  });
});

// ─────────────────────────────────────────────
// POST /cadastro
// ─────────────────────────────────────────────
describe('POST /cadastro', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 quando nome não é enviado', async () => {
    const res = await request(app).post('/cadastro').send({ email: 'a@b.com', matricula: '123', curso_id: 'c1' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando nome tem menos de 2 caracteres', async () => {
    const res = await request(app).post('/cadastro').send({ nome: 'A', email: 'a@b.com', matricula: '123', curso_id: 'c1' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando email é inválido', async () => {
    const res = await request(app).post('/cadastro').send({ nome: 'João', email: 'invalido', matricula: '123', curso_id: 'c1' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando matrícula não é enviada', async () => {
    const res = await request(app).post('/cadastro').send({ nome: 'João', email: 'a@b.com', curso_id: 'c1' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando curso_id não é enviado', async () => {
    const res = await request(app).post('/cadastro').send({ nome: 'João', email: 'a@b.com', matricula: '123' });
    expect(res.status).toBe(400);
  });

  it('retorna 409 quando e-mail já está cadastrado', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce({ ...USUARIO_CRIADO });
    const res = await request(app).post('/cadastro').send({
      nome: 'Maria', email: 'maria@uni.edu', matricula: '123', curso_id: 'curso-1',
    });
    expect(res.status).toBe(409);
    expect(res.body.erro).toContain('E-mail já cadastrado');
  });

  it('retorna 400 quando curso não é encontrado', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce(null);
    mockCursos.buscarCursoPorId.mockResolvedValueOnce(null);
    const res = await request(app).post('/cadastro').send({
      nome: 'Maria', email: 'maria@uni.edu', matricula: '123', curso_id: 'curso-inexistente',
    });
    expect(res.status).toBe(400);
  });

  it('retorna 403 quando domínio do e-mail não é aceito pela instituição', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce(null);
    mockCursos.buscarCursoPorId.mockResolvedValueOnce({
      ...CURSO_MOCK,
      dominios_email: ['outra.edu.br'],
    });
    const res = await request(app).post('/cadastro').send({
      nome: 'Maria', email: 'maria@uni.edu', matricula: '123', curso_id: 'curso-1',
    });
    expect(res.status).toBe(403);
  });

  it('retorna 201 com token e dados quando cadastro é bem-sucedido', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce(null);
    mockCursos.buscarCursoPorId.mockResolvedValueOnce(CURSO_MOCK);
    mockUsuarios.criarUsuario.mockResolvedValueOnce(USUARIO_CRIADO);
    const res = await request(app).post('/cadastro').send({
      nome: 'Maria Silva', email: 'maria@uni.edu', matricula: '2021002', curso_id: 'curso-1',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.perfil).toBe('estudante');
    expect(res.body.usuario.email).toBe('maria@uni.edu');
  });

  it('retorna 201 quando instituição tem lista de domínios vazia (sem restrição)', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce(null);
    mockCursos.buscarCursoPorId.mockResolvedValueOnce({ ...CURSO_MOCK, dominios_email: [] });
    mockUsuarios.criarUsuario.mockResolvedValueOnce(USUARIO_CRIADO);
    const res = await request(app).post('/cadastro').send({
      nome: 'Maria Silva', email: 'maria@qualquer.com', matricula: '2021002', curso_id: 'curso-1',
    });
    expect(res.status).toBe(201);
  });

  it('retorna 201 quando domínio é aceito pela instituição', async () => {
    mockUsuarios.buscarPorEmail.mockResolvedValueOnce(null);
    mockCursos.buscarCursoPorId.mockResolvedValueOnce({ ...CURSO_MOCK, dominios_email: ['uni.edu'] });
    mockUsuarios.criarUsuario.mockResolvedValueOnce(USUARIO_CRIADO);
    const res = await request(app).post('/cadastro').send({
      nome: 'Maria Silva', email: 'maria@uni.edu', matricula: '2021002', curso_id: 'curso-1',
    });
    expect(res.status).toBe(201);
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockUsuarios.buscarPorEmail.mockRejectedValueOnce(new Error('DB indisponível'));
    const res = await request(app).post('/cadastro').send({
      nome: 'Maria Silva', email: 'maria@uni.edu', matricula: '2021002', curso_id: 'curso-1',
    });
    expect(res.status).toBe(500);
  });
});
