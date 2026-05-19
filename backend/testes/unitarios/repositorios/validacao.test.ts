jest.mock('../../../src/banco/conexao', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

import { pool } from '../../../src/banco/conexao';
import {
  executarAcao,
  buscarHistoricoPorDocumento,
} from '../../../src/modulos/validacao/repositorio';

const mockPoolQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;

const clienteMock = {
  query: jest.fn(),
  release: jest.fn(),
};

const DOC_ROW = {
  id: 'doc-1',
  titulo: 'Estágio XYZ',
  status: 'pendente',
  estudante_id: 'est-1',
  curso_id: 'curso-1',
  coordenador_id: null,
};

const HISTORICO_ROW = {
  id: 'hist-1',
  documento_id: 'doc-1',
  usuario_id: 'coord-1',
  status_anterior: 'pendente',
  status_novo: 'aprovado',
  observacoes: null,
  metadados: null,
  ocorrido_em: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockConnect.mockResolvedValue(clienteMock);
});

// ─────────────────────────────────────────────
// executarAcao
// ─────────────────────────────────────────────
describe('executarAcao', () => {
  function mockTransacao(docRows: object[]) {
    clienteMock.query
      .mockResolvedValueOnce(undefined)                                          // BEGIN
      .mockResolvedValueOnce({ rows: docRows })                                  // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ ...DOC_ROW, status: 'aprovado' }] })    // UPDATE documento
      .mockResolvedValueOnce({ rows: [{ ...HISTORICO_ROW }] })                  // INSERT historico
      .mockResolvedValueOnce(undefined);                                         // COMMIT
  }

  it('aprova documento e retorna documento e histórico', async () => {
    mockTransacao([DOC_ROW]);

    const resultado = await executarAcao('doc-1', 'coord-1', 'aprovar', 'Aprovado com louvor');

    expect(resultado.documento).toBeDefined();
    expect(resultado.historico).toBeDefined();
    expect(clienteMock.release).toHaveBeenCalled();

    const queryArgs = clienteMock.query.mock.calls;
    expect(queryArgs[0][0]).toBe('BEGIN');
    expect(queryArgs[4][0]).toBe('COMMIT');
  });

  it('reprova documento e aplica o status reprovado', async () => {
    clienteMock.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [DOC_ROW] })
      .mockResolvedValueOnce({ rows: [{ ...DOC_ROW, status: 'reprovado' }] })
      .mockResolvedValueOnce({ rows: [{ ...HISTORICO_ROW, status_novo: 'reprovado' }] })
      .mockResolvedValueOnce(undefined);

    const resultado = await executarAcao('doc-1', 'coord-1', 'reprovar');

    expect(resultado.documento).toBeDefined();
    expect(clienteMock.query).toHaveBeenCalledWith('COMMIT');
  });

  it('solicita revisão e aplica o status revisao_solicitada', async () => {
    clienteMock.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [DOC_ROW] })
      .mockResolvedValueOnce({ rows: [{ ...DOC_ROW, status: 'revisao_solicitada' }] })
      .mockResolvedValueOnce({ rows: [{ ...HISTORICO_ROW, status_novo: 'revisao_solicitada' }] })
      .mockResolvedValueOnce(undefined);

    const resultado = await executarAcao('doc-1', 'coord-1', 'solicitar-revisao', 'Revisar carga horária');

    expect(resultado.documento).toBeDefined();
    expect(resultado.historico).toBeDefined();
  });

  it('lança erro e executa ROLLBACK quando documento não é encontrado', async () => {
    clienteMock.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // SELECT → não encontrado

    await expect(executarAcao('doc-inexistente', 'coord-1', 'aprovar')).rejects.toThrow(
      'não encontrado',
    );

    expect(clienteMock.query).toHaveBeenCalledWith('ROLLBACK');
    expect(clienteMock.release).toHaveBeenCalled();
  });

  it('lança erro e executa ROLLBACK em caso de falha no banco', async () => {
    clienteMock.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('Deadlock detectado')); // SELECT → erro

    await expect(executarAcao('doc-1', 'coord-1', 'reprovar')).rejects.toThrow('Deadlock detectado');

    expect(clienteMock.query).toHaveBeenCalledWith('ROLLBACK');
    expect(clienteMock.release).toHaveBeenCalled();
  });

  it('libera a conexão mesmo após ROLLBACK', async () => {
    clienteMock.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] }); // doc não encontrado → rollback

    await expect(executarAcao('doc-1', 'coord-1', 'aprovar')).rejects.toThrow();

    expect(clienteMock.release).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────
// buscarHistoricoPorDocumento
// ─────────────────────────────────────────────
describe('buscarHistoricoPorDocumento', () => {
  it('retorna lista de histórico para o documento', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [HISTORICO_ROW] });

    const resultado = await buscarHistoricoPorDocumento('doc-1');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].status_novo).toBe('aprovado');
    expect(resultado[0].documento_id).toBe('doc-1');
  });

  it('retorna array vazio quando não há histórico', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await buscarHistoricoPorDocumento('doc-sem-historico');

    expect(resultado).toEqual([]);
  });

  it('passa o documentoId como parâmetro da query', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    await buscarHistoricoPorDocumento('doc-abc');

    expect(mockPoolQuery.mock.calls[0][1]).toEqual(['doc-abc']);
  });

  it('retorna múltiplos registros em ordem cronológica', async () => {
    const historico = [
      { ...HISTORICO_ROW, status_novo: 'em_analise' },
      { ...HISTORICO_ROW, id: 'hist-2', status_novo: 'aprovado' },
    ];
    mockPoolQuery.mockResolvedValueOnce({ rows: historico });

    const resultado = await buscarHistoricoPorDocumento('doc-1');

    expect(resultado).toHaveLength(2);
    expect(resultado[0].status_novo).toBe('em_analise');
    expect(resultado[1].status_novo).toBe('aprovado');
  });
});
