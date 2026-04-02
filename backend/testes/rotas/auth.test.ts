import express from 'express';
import request from 'supertest';

jest.mock('../../src/banco/conexao', () => ({
  pool: { query: jest.fn(), on: jest.fn(), connect: jest.fn() },
}));

import { pool } from '../../src/banco/conexao';
import router from '../../src/modulos/auth/rotas';

const mockQuery = pool.query as jest.Mock;

const app = express();
app.use(express.json());
app.use('/', router);

describe('POST /login-dev', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 quando email não é enviado', async () => {
    const res = await request(app).post('/login-dev').send({});
    expect(res.status).toBe(400);
    expect(res.body.erro).toBeDefined();
  });

  it('retorna 404 quando o usuário não existe no banco', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/login-dev').send({ email: 'naoexiste@email.com' });
    expect(res.status).toBe(404);
    expect(res.body.erro).toContain('não encontrado');
  });

  it('retorna 200 com token e dados do usuário quando o login é bem-sucedido', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'id-1', nome: 'João Silva', email: 'joao@email.com', perfil: 'estudante' }],
    });
    const res = await request(app).post('/login-dev').send({ email: 'joao@email.com' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.email).toBe('joao@email.com');
    expect(res.body.usuario.perfil).toBe('estudante');
  });

  it('retorna 500 em caso de erro no banco de dados', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB indisponível'));
    const res = await request(app).post('/login-dev').send({ email: 'qualquer@email.com' });
    expect(res.status).toBe(500);
    expect(res.body.erro).toBe('Erro interno');
  });
});
