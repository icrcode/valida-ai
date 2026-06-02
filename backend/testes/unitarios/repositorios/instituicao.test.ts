jest.mock('../../../src/banco/conexao', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../../src/banco/conexao';
import {
  listarInstituicoes,
  buscarInstituicaoPorId,
  buscarInstituicaoPorSigla,
  criarInstituicao,
  atualizarInstituicao,
  alterarAtiva,
} from '../../../src/modulos/instituicoes/repositorio';

const mockQuery = pool.query as jest.Mock;

const INST_ROW = {
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

beforeEach(() => jest.resetAllMocks());

describe('listarInstituicoes', () => {
  it('retorna lista de instituições', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [INST_ROW] });
    const resultado = await listarInstituicoes();
    expect(resultado).toHaveLength(1);
    expect(resultado[0].sigla).toBe('UT');
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT');
  });

  it('retorna array vazio quando não há registros', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const resultado = await listarInstituicoes();
    expect(resultado).toHaveLength(0);
  });
});

describe('buscarInstituicaoPorId', () => {
  it('retorna instituição quando encontrada', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [INST_ROW] });
    const resultado = await buscarInstituicaoPorId('inst-1');
    expect(resultado).not.toBeNull();
    expect(resultado!.id).toBe('inst-1');
  });

  it('retorna null quando não encontrada', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const resultado = await buscarInstituicaoPorId('nao-existe');
    expect(resultado).toBeNull();
  });
});

describe('buscarInstituicaoPorSigla', () => {
  it('retorna instituição quando sigla existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'inst-1' }] });
    const resultado = await buscarInstituicaoPorSigla('UT');
    expect(resultado).not.toBeNull();
  });

  it('retorna null quando sigla não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const resultado = await buscarInstituicaoPorSigla('XX');
    expect(resultado).toBeNull();
  });
});

describe('criarInstituicao', () => {
  it('executa INSERT e retorna a instituição criada', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'inst-1' }] })
      .mockResolvedValueOnce({ rows: [INST_ROW] });

    const resultado = await criarInstituicao({ nome: 'Universidade Teste', sigla: 'UT' });
    expect(resultado.id).toBe('inst-1');
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO instituicoes');
  });

  it('lança erro quando busca após criação retorna null', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'inst-novo' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(criarInstituicao({ nome: 'Universidade', sigla: 'UV' })).rejects.toThrow(
      'Falha ao recuperar instituição após criação',
    );
  });
});

describe('atualizarInstituicao', () => {
  it('executa UPDATE com campos fornecidos e retorna instituição', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [INST_ROW] });

    const resultado = await atualizarInstituicao('inst-1', { nome: 'Novo Nome' });
    expect(resultado).not.toBeNull();
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE instituicoes');
  });

  it('retorna resultado do buscar quando nenhum campo é fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [INST_ROW] });
    const resultado = await atualizarInstituicao('inst-1', {});
    expect(resultado).not.toBeNull();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('converte sigla para maiúsculo', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [INST_ROW] });

    await atualizarInstituicao('inst-1', { sigla: 'ut' });
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params).toContain('UT');
  });
});

describe('alterarAtiva', () => {
  it('executa UPDATE e retorna instituição atualizada', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ ...INST_ROW, ativa: false }] });

    const resultado = await alterarAtiva('inst-1', false);
    expect(resultado).not.toBeNull();
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE instituicoes');
    expect(mockQuery.mock.calls[0][1]).toContain(false);
  });

  it('retorna null quando instituição não existe', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const resultado = await alterarAtiva('nao-existe', true);
    expect(resultado).toBeNull();
  });
});
