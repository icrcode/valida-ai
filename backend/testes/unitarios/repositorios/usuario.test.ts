jest.mock('../../../src/banco/conexao', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../../src/banco/conexao';
import {
  buscarPorId,
  buscarPorEmail,
  listarTodos,
  atualizarNome,
} from '../../../src/modulos/usuarios/repositorio';

const mockQuery = pool.query as jest.Mock;

const USUARIO_ROW = {
  id: 'usr-1',
  nome: 'João Silva',
  email: 'joao@uni.edu',
  matricula: '2021001',
  perfil: 'estudante' as const,
  curso_id: 'curso-1',
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// buscarPorId
// ─────────────────────────────────────────────
describe('buscarPorId', () => {
  it('retorna o usuário quando encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [USUARIO_ROW] });

    const resultado = await buscarPorId('usr-1');

    expect(resultado).not.toBeNull();
    expect(resultado!.id).toBe('usr-1');
    expect(resultado!.perfil).toBe('estudante');
  });

  it('retorna null quando não encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await buscarPorId('nao-existe');

    expect(resultado).toBeNull();
  });

  it('passa o id como parâmetro da query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [USUARIO_ROW] });

    await buscarPorId('usr-abc');

    expect(mockQuery.mock.calls[0][1]).toEqual(['usr-abc']);
  });
});

// ─────────────────────────────────────────────
// buscarPorEmail
// ─────────────────────────────────────────────
describe('buscarPorEmail', () => {
  it('retorna o usuário pelo email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [USUARIO_ROW] });

    const resultado = await buscarPorEmail('joao@uni.edu');

    expect(resultado).not.toBeNull();
    expect(resultado!.email).toBe('joao@uni.edu');
    expect(mockQuery.mock.calls[0][1]).toEqual(['joao@uni.edu']);
  });

  it('retorna null para email inexistente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await buscarPorEmail('nao@existe.com');

    expect(resultado).toBeNull();
  });
});

// ─────────────────────────────────────────────
// listarTodos
// ─────────────────────────────────────────────
describe('listarTodos', () => {
  it('retorna lista de usuários ordenada por nome', async () => {
    const usuarios = [
      { ...USUARIO_ROW, nome: 'Ana' },
      { ...USUARIO_ROW, id: 'usr-2', nome: 'João' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: usuarios });

    const resultado = await listarTodos();

    expect(resultado).toHaveLength(2);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('ORDER BY nome');
  });

  it('retorna array vazio quando não há usuários', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await listarTodos();

    expect(resultado).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// atualizarNome
// ─────────────────────────────────────────────
describe('atualizarNome', () => {
  it('executa UPDATE e retorna o usuário atualizado', async () => {
    const atualizado = { ...USUARIO_ROW, nome: 'João Novo' };
    mockQuery.mockResolvedValueOnce({ rows: [atualizado] });

    const resultado = await atualizarNome('usr-1', 'João Novo');

    expect(resultado).not.toBeNull();
    expect(resultado!.nome).toBe('João Novo');
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE usuarios');
    expect(mockQuery.mock.calls[0][1]).toContain('João Novo');
  });

  it('retorna null quando usuário não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await atualizarNome('nao-existe', 'Nome');

    expect(resultado).toBeNull();
  });
});
