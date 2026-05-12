jest.mock('../../../src/banco/conexao', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../../src/banco/conexao';
import {
  criar,
  buscarPorId,
  buscarPorHash,
  buscarPorDocumento,
  buscarPorEstudante,
} from '../../../src/modulos/certificados/repositorio';

const mockQuery = pool.query as jest.Mock;

const CERT_ROW = {
  id: 'cert-1',
  documento_id: 'doc-1',
  estudante_id: 'est-1',
  hash: 'a'.repeat(64),
  caminho_arquivo: 'certificados/doc-1/aaaa.pdf',
  criado_em: new Date(),
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// criar
// ─────────────────────────────────────────────
describe('criar', () => {
  it('executa INSERT e retorna o certificado criado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CERT_ROW] });

    const resultado = await criar({
      documento_id: 'doc-1',
      estudante_id: 'est-1',
      hash: 'a'.repeat(64),
      caminho_arquivo: 'certificados/doc-1/aaaa.pdf',
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO certificados');
    expect(resultado.id).toBe('cert-1');
    expect(resultado.hash).toBe('a'.repeat(64));
  });
});

// ─────────────────────────────────────────────
// buscarPorId
// ─────────────────────────────────────────────
describe('buscarPorId', () => {
  it('retorna o certificado quando encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CERT_ROW] });

    const resultado = await buscarPorId('cert-1');

    expect(resultado).not.toBeNull();
    expect(resultado!.id).toBe('cert-1');
  });

  it('retorna null quando não encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await buscarPorId('nao-existe');

    expect(resultado).toBeNull();
  });
});

// ─────────────────────────────────────────────
// buscarPorHash
// ─────────────────────────────────────────────
describe('buscarPorHash', () => {
  it('retorna o certificado pelo hash', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CERT_ROW] });

    const resultado = await buscarPorHash('a'.repeat(64));

    expect(resultado).not.toBeNull();
    expect(resultado!.hash).toBe('a'.repeat(64));
    expect(mockQuery.mock.calls[0][1]).toContain('a'.repeat(64));
  });

  it('retorna null para hash inexistente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await buscarPorHash('hash-inexistente');

    expect(resultado).toBeNull();
  });
});

// ─────────────────────────────────────────────
// buscarPorDocumento
// ─────────────────────────────────────────────
describe('buscarPorDocumento', () => {
  it('retorna o certificado associado ao documento', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CERT_ROW] });

    const resultado = await buscarPorDocumento('doc-1');

    expect(resultado).not.toBeNull();
    expect(resultado!.documento_id).toBe('doc-1');
  });

  it('retorna null quando documento não tem certificado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await buscarPorDocumento('doc-sem-cert');

    expect(resultado).toBeNull();
  });
});

// ─────────────────────────────────────────────
// buscarPorEstudante
// ─────────────────────────────────────────────
describe('buscarPorEstudante', () => {
  it('retorna todos os certificados do estudante', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CERT_ROW, { ...CERT_ROW, id: 'cert-2' }] });

    const resultado = await buscarPorEstudante('est-1');

    expect(resultado).toHaveLength(2);
    expect(mockQuery.mock.calls[0][1]).toContain('est-1');
  });

  it('retorna array vazio quando estudante não tem certificados', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resultado = await buscarPorEstudante('est-sem-cert');

    expect(resultado).toEqual([]);
  });
});
