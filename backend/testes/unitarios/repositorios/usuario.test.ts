jest.mock('../../../src/banco/conexao', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../../src/banco/conexao';
import {
  buscarPorId,
  buscarPorEmail,
  listarTodos,
  atualizarNome,
  criarUsuario,
  atualizarUsuario,
  alterarAtivo,
} from '../../../src/modulos/usuarios/repositorio';

const mockQuery = pool.query as jest.Mock;

const USUARIO_ROW = {
  id: 'usr-1',
  nome: 'João Silva',
  email: 'joao@uni.edu',
  matricula: '2021001',
  perfil: 'estudante' as const,
  curso_id: 'curso-1',
  instituicao_id: 'inst-1',
  instituicao_nome: 'Universidade Teste',
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
  it('retorna o usuário pelo e-mail', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [USUARIO_ROW] });

    const resultado = await buscarPorEmail('joao@uni.edu');

    expect(resultado).not.toBeNull();
    expect(resultado!.email).toBe('joao@uni.edu');
    expect(mockQuery.mock.calls[0][1]).toEqual(['joao@uni.edu']);
  });

  it('retorna null para e-mail inexistente', async () => {
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
    expect(sql).toContain('ORDER BY u.nome');
  });

  it('retorna array vazio quando não há usuários', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await listarTodos();

    expect(resultado).toEqual([]);
  });

  it('filtra por instituicao_id quando passado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [USUARIO_ROW] });

    const resultado = await listarTodos('inst-1');

    expect(resultado).toHaveLength(1);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('WHERE');
    expect(mockQuery.mock.calls[0][1]).toEqual(['inst-1']);
  });
});

// ─────────────────────────────────────────────
// atualizarNome
// ─────────────────────────────────────────────
describe('atualizarNome', () => {
  it('executa UPDATE e retorna o usuário atualizado', async () => {
    const atualizado = { ...USUARIO_ROW, nome: 'João Novo' };
    mockQuery
      .mockResolvedValueOnce({ rows: [] })           // UPDATE
      .mockResolvedValueOnce({ rows: [atualizado] }); // buscarPorId

    const resultado = await atualizarNome('usr-1', 'João Novo');

    expect(resultado).not.toBeNull();
    expect(resultado!.nome).toBe('João Novo');
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE usuarios');
    expect(mockQuery.mock.calls[0][1]).toContain('João Novo');
  });

  it('retorna null quando usuário não existe', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }); // buscarPorId → null

    const resultado = await atualizarNome('nao-existe', 'Nome');

    expect(resultado).toBeNull();
  });
});

// ─────────────────────────────────────────────
// criarUsuario
// ─────────────────────────────────────────────
describe('criarUsuario', () => {
  it('insere usuário e retorna os dados completos', async () => {
    const novo = { ...USUARIO_ROW, id: 'usr-novo', email: 'novo@uni.edu' };
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'usr-novo' }] }) // INSERT RETURNING id
      .mockResolvedValueOnce({ rows: [novo] });               // buscarPorId

    const resultado = await criarUsuario({
      nome: 'João Silva',
      email: 'novo@uni.edu',
      senha_hash: '$2b$10$hash',
      perfil: 'estudante',
      matricula: '2021001',
      curso_id: 'curso-1',
    });

    expect(resultado.id).toBe('usr-novo');
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO usuarios');
    expect(mockQuery.mock.calls[0][1]).toContain('novo@uni.edu');
    expect(mockQuery.mock.calls[0][1]).toContain('$2b$10$hash');
  });

  it('passa null para matricula e curso_id quando não fornecidos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'usr-admin' }] })
      .mockResolvedValueOnce({ rows: [USUARIO_ROW] });

    await criarUsuario({ nome: 'Admin', email: 'admin@uni.edu', senha_hash: '$2b$10$hash', perfil: 'admin' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[4]).toBeNull(); // matricula (índice 4, após nome/email/senha_hash/perfil)
    expect(params[5]).toBeNull(); // curso_id
  });
});

// ─────────────────────────────────────────────
// atualizarUsuario
// ─────────────────────────────────────────────
describe('atualizarUsuario', () => {
  it('atualiza campos enviados e retorna usuário atualizado', async () => {
    const atualizado = { ...USUARIO_ROW, nome: 'Maria', perfil: 'coordenador' as const };
    mockQuery
      .mockResolvedValueOnce({ rows: [] })              // UPDATE
      .mockResolvedValueOnce({ rows: [atualizado] });    // buscarPorId

    const resultado = await atualizarUsuario('usr-1', { nome: 'Maria', perfil: 'coordenador' });

    expect(resultado!.nome).toBe('Maria');
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE usuarios');
    expect(mockQuery.mock.calls[0][0]).toContain('nome =');
    expect(mockQuery.mock.calls[0][0]).toContain('perfil =');
  });

  it('retorna usuário sem executar UPDATE quando nenhum campo é enviado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [USUARIO_ROW] }); // buscarPorId

    const resultado = await atualizarUsuario('usr-1', {});

    expect(resultado!.id).toBe('usr-1');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('inclui matricula e curso_id no UPDATE quando fornecidos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [USUARIO_ROW] });

    await atualizarUsuario('usr-1', { matricula: '9999', curso_id: 'outro-curso' });

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('matricula =');
    expect(sql).toContain('curso_id =');
  });

  it('retorna null quando usuário não existe após update', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }); // buscarPorId → null

    const resultado = await atualizarUsuario('nao-existe', { nome: 'Teste' });

    expect(resultado).toBeNull();
  });
});

// ─────────────────────────────────────────────
// alterarAtivo
// ─────────────────────────────────────────────
describe('alterarAtivo', () => {
  it('desativa usuário e retorna os dados atualizados', async () => {
    const inativo = { ...USUARIO_ROW, ativo: false };
    mockQuery
      .mockResolvedValueOnce({ rows: [] })           // UPDATE
      .mockResolvedValueOnce({ rows: [inativo] });    // buscarPorId

    const resultado = await alterarAtivo('usr-1', false);

    expect(resultado!.ativo).toBe(false);
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE usuarios');
    expect(mockQuery.mock.calls[0][0]).toContain('ativo =');
    expect(mockQuery.mock.calls[0][1]).toContain(false);
  });

  it('ativa usuário e retorna dados', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [USUARIO_ROW] });

    const resultado = await alterarAtivo('usr-1', true);

    expect(resultado!.ativo).toBe(true);
    expect(mockQuery.mock.calls[0][1]).toContain(true);
  });

  it('retorna null quando usuário não existe', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const resultado = await alterarAtivo('nao-existe', false);

    expect(resultado).toBeNull();
  });
});
