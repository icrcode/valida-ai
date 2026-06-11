jest.mock('../../../src/banco/conexao', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../../src/banco/conexao';
import {
  listarCursos,
  listarCursosAtivos,
  buscarCursoPorId,
  criarCurso,
  atualizarCurso,
  alterarAtivo,
  listarCursosDoCoordenador,
  listarCursoIdsDoCoordenador,
  coordenadorTemCurso,
  listarAlunosDoCurso,
} from '../../../src/modulos/cursos/repositorio';

const mockQuery = pool.query as jest.Mock;

const CURSO_ROW = {
  id: 'curso-1',
  nome: 'Ciência da Computação',
  codigo: 'UT001',
  carga_horaria_complementar: 200,
  turno: 'noturno',
  modalidade: 'presencial',
  instituicao_id: 'inst-1',
  instituicao_nome: 'Universidade Teste',
  instituicao_sigla: 'UT',
  dominios_email: [],
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
};

beforeEach(() => jest.resetAllMocks());

describe('listarCursos', () => {
  it('retorna todos os cursos sem filtro', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CURSO_ROW] });
    const resultado = await listarCursos();
    expect(resultado).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('GROUP BY');
  });

  it('filtra por instituicao_id quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CURSO_ROW] });
    await listarCursos('inst-1');
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params).toContain('inst-1');
  });
});

describe('listarCursosAtivos', () => {
  it('retorna apenas cursos ativos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CURSO_ROW] });
    const resultado = await listarCursosAtivos();
    expect(resultado).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('ativo = true');
  });
});

describe('buscarCursoPorId', () => {
  it('retorna curso quando encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CURSO_ROW] });
    const resultado = await buscarCursoPorId('curso-1');
    expect(resultado).not.toBeNull();
    expect(resultado!.id).toBe('curso-1');
  });

  it('retorna null quando não encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const resultado = await buscarCursoPorId('nao-existe');
    expect(resultado).toBeNull();
  });
});

describe('criarCurso', () => {
  it('gera código e executa INSERT retornando o curso criado', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ sigla: 'UT' }] })    // gerarCodigo: busca sigla
      .mockResolvedValueOnce({ rows: [] })                    // gerarCodigo: verifica UT001
      .mockResolvedValueOnce({ rows: [{ id: 'curso-novo' }] }) // INSERT
      .mockResolvedValueOnce({ rows: [CURSO_ROW] });           // buscarCursoPorId

    const resultado = await criarCurso({ nome: 'CC', instituicao_id: 'inst-1' });
    expect(resultado.id).toBe('curso-1');
    expect(mockQuery.mock.calls[2][0]).toContain('INSERT INTO cursos');
  });

  it('lança erro quando busca após criação retorna null', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ sigla: 'UT' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'curso-novo' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(criarCurso({ nome: 'CC', instituicao_id: 'inst-1' })).rejects.toThrow(
      'Falha ao recuperar curso após criação',
    );
  });
});

describe('atualizarCurso', () => {
  it('executa UPDATE com campos fornecidos e retorna curso', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [CURSO_ROW] });

    const resultado = await atualizarCurso('curso-1', { nome: 'Novo Nome' });
    expect(resultado).not.toBeNull();
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE cursos');
  });

  it('retorna resultado do buscar quando nenhum campo é fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CURSO_ROW] });
    const resultado = await atualizarCurso('curso-1', {});
    expect(resultado).not.toBeNull();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

describe('alterarAtivo', () => {
  it('executa UPDATE e retorna curso atualizado', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ ...CURSO_ROW, ativo: false }] });

    const resultado = await alterarAtivo('curso-1', false);
    expect(resultado).not.toBeNull();
    expect(mockQuery.mock.calls[0][1]).toContain(false);
  });

  it('retorna null quando curso não existe', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const resultado = await alterarAtivo('nao-existe', true);
    expect(resultado).toBeNull();
  });
});

describe('listarCursosDoCoordenador', () => {
  it('retorna os cursos vinculados ao coordenador', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CURSO_ROW] });

    const resultado = await listarCursosDoCoordenador('coord-1');

    expect(resultado).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('coordenadores_cursos');
    expect(mockQuery.mock.calls[0][1]).toEqual(['coord-1']);
  });

  it('retorna lista vazia quando o coordenador não tem cursos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await listarCursosDoCoordenador('coord-1');

    expect(resultado).toHaveLength(0);
  });
});

describe('listarCursoIdsDoCoordenador', () => {
  it('retorna os ids dos cursos vinculados ao coordenador', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ curso_id: 'curso-1' }, { curso_id: 'curso-2' }] });

    const resultado = await listarCursoIdsDoCoordenador('coord-1');

    expect(resultado).toEqual(['curso-1', 'curso-2']);
    expect(mockQuery.mock.calls[0][1]).toEqual(['coord-1']);
  });

  it('retorna lista vazia quando o coordenador não tem cursos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await listarCursoIdsDoCoordenador('coord-1');

    expect(resultado).toEqual([]);
  });
});

describe('coordenadorTemCurso', () => {
  it('retorna true quando o coordenador é responsável pelo curso', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{}] });

    const resultado = await coordenadorTemCurso('coord-1', 'curso-1');

    expect(resultado).toBe(true);
    expect(mockQuery.mock.calls[0][1]).toEqual(['coord-1', 'curso-1']);
  });

  it('retorna false quando o coordenador não é responsável pelo curso', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const resultado = await coordenadorTemCurso('coord-1', 'curso-2');

    expect(resultado).toBe(false);
  });
});

describe('listarAlunosDoCurso', () => {
  it('retorna os estudantes vinculados ao curso', async () => {
    const ALUNO_ROW = {
      id: 'est-1',
      nome: 'João Silva',
      email: 'joao@uni.edu',
      matricula: '2021001',
      ativo: true,
      criado_em: new Date(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [ALUNO_ROW] });

    const resultado = await listarAlunosDoCurso('curso-1');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('João Silva');
    expect(mockQuery.mock.calls[0][0]).toContain("perfil = 'estudante'");
    expect(mockQuery.mock.calls[0][1]).toEqual(['curso-1']);
  });

  it('retorna lista vazia quando o curso não tem alunos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await listarAlunosDoCurso('curso-1');

    expect(resultado).toEqual([]);
  });
});
