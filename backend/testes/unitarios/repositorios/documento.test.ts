jest.mock('../../../src/banco/conexao', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../../src/banco/conexao';
import {
  criar,
  buscarPorId,
  listar,
  cancelar,
} from '../../../src/modulos/documentos/repositorio';

const mockQuery = pool.query as jest.Mock;

const DOC_ROW = {
  id: 'doc-1',
  titulo: 'Certificado XYZ',
  tipo: 'certificado_curso',
  carga_horaria: 40,
  estudante_id: 'est-1',
  curso_id: 'curso-1',
  status: 'pendente',
  coordenador_id: null,
  nome_arquivo: 'certificado.pdf',
  caminho_arquivo: 'documentos/est-1/certificado.pdf',
  tamanho_arquivo: 1024,
  mime_type: 'application/pdf',
  criado_em: new Date(),
  atualizado_em: new Date(),
};

beforeEach(() => jest.resetAllMocks());

// ─────────────────────────────────────────────
// criar
// ─────────────────────────────────────────────
describe('criar', () => {
  it('executa INSERT e retorna o documento criado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [DOC_ROW] });

    const resultado = await criar({
      titulo: 'Certificado XYZ',
      tipo: 'certificado_curso',
      carga_horaria: 40,
      estudante_id: 'est-1',
      curso_id: 'curso-1',
      nome_arquivo: 'certificado.pdf',
      caminho_arquivo: 'documentos/est-1/certificado.pdf',
      tamanho_arquivo: 1024,
      mime_type: 'application/pdf',
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO documentos');
    expect(resultado.id).toBe('doc-1');
    expect(resultado.status).toBe('pendente');
  });
});

// ─────────────────────────────────────────────
// buscarPorId
// ─────────────────────────────────────────────
describe('buscarPorId', () => {
  it('retorna o documento quando encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [DOC_ROW] });

    const resultado = await buscarPorId('doc-1');

    expect(resultado).not.toBeNull();
    expect(resultado!.id).toBe('doc-1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      ['doc-1'],
    );
  });

  it('retorna null quando não encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await buscarPorId('nao-existe');

    expect(resultado).toBeNull();
  });
});

// ─────────────────────────────────────────────
// listar
// ─────────────────────────────────────────────
describe('listar', () => {
  it('estudante só vê seus próprios documentos (WHERE estudante_id)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [DOC_ROW] });

    const resultado = await listar({}, 'est-1', 'estudante');

    expect(resultado.total).toBe(1);
    expect(resultado.dados).toHaveLength(1);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('estudante_id');
  });

  it('coordenador vê todos sem restrição de estudante_id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })
      .mockResolvedValueOnce({ rows: [DOC_ROW] });

    const resultado = await listar({}, 'coord-1', 'coordenador', ['curso-1']);

    expect(resultado.total).toBe(5);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).not.toContain('estudante_id');
  });

  it('coordenador sem cursos vinculados não retorna documentos', async () => {
    const resultado = await listar({}, 'coord-1', 'coordenador', []);

    expect(resultado).toEqual({ dados: [], total: 0 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('coordenador com múltiplos cursos usa curso_id = ANY(...)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })
      .mockResolvedValueOnce({ rows: [DOC_ROW] });

    await listar({}, 'coord-1', 'coordenador', ['curso-1', 'curso-2']);

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('curso_id = ANY(');
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params).toContainEqual(['curso-1', 'curso-2']);
  });

  it('coordenador pode filtrar por um curso específico dentre os seus', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [DOC_ROW] });

    await listar({ curso_id: 'curso-2' }, 'coord-1', 'coordenador', ['curso-1', 'curso-2']);

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('curso_id = $1');
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params).toContain('curso-2');
  });

  it('coordenador filtrando por curso fora do seu escopo não retorna documentos', async () => {
    const resultado = await listar({ curso_id: 'curso-outro' }, 'coord-1', 'coordenador', ['curso-1']);

    expect(resultado).toEqual({ dados: [], total: 0 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('aplica filtro de status quando fornecido', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [DOC_ROW] });

    await listar({ status: 'aprovado' }, 'coord-1', 'coordenador', ['curso-1']);

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('status');
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params).toContain('aprovado');
  });

  it('respeita limite máximo de 100 registros', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '200' }] })
      .mockResolvedValueOnce({ rows: [] });

    await listar({ limite: 500 }, 'coord-1', 'coordenador', ['curso-1']);

    const params = mockQuery.mock.calls[1][1] as unknown[];
    expect(params).toContain(100);
  });
});

// ─────────────────────────────────────────────
// cancelar
// ─────────────────────────────────────────────
describe('cancelar', () => {
  it('retorna documento atualizado quando cancelamento tem sucesso', async () => {
    const cancelado = { ...DOC_ROW, status: 'cancelado' };
    mockQuery.mockResolvedValueOnce({ rows: [cancelado] });

    const resultado = await cancelar('doc-1', 'est-1');

    expect(resultado).not.toBeNull();
    expect(resultado!.status).toBe('cancelado');
    expect(mockQuery.mock.calls[0][0]).toContain("status = 'cancelado'");
  });

  it('retorna null quando documento não pertence ao estudante ou não está pendente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await cancelar('doc-1', 'outro-estudante');

    expect(resultado).toBeNull();
  });
});
