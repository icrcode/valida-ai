import { describe, it, expect, vi, beforeEach } from 'vitest';
import { certificadosService } from '../../services/certificados';

vi.mock('../../services/api');

import api from '../../services/api';
const mockGet = (api as unknown as { get: ReturnType<typeof vi.fn> }).get;

beforeEach(() => vi.clearAllMocks());

const CERT_MOCK = { id: 'cert-1', documento_id: 'doc-1', estudante_id: 'u-1', hash: 'abc123', caminho_arquivo: 'cert.pdf', criado_em: '' };

describe('certificadosService.listar', () => {
  it('chama GET /api/certificados', async () => {
    mockGet.mockResolvedValueOnce({ data: [CERT_MOCK] });
    const resultado = await certificadosService.listar();
    expect(mockGet).toHaveBeenCalledWith('/api/certificados');
    expect(resultado).toHaveLength(1);
  });
});

describe('certificadosService.buscarPorId', () => {
  it('chama GET /api/certificados/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: CERT_MOCK });
    const resultado = await certificadosService.buscarPorId('cert-1');
    expect(mockGet).toHaveBeenCalledWith('/api/certificados/cert-1');
    expect(resultado.id).toBe('cert-1');
  });
});

describe('certificadosService.buscarUrlDownload', () => {
  it('chama GET /api/certificados/:id/download', async () => {
    mockGet.mockResolvedValueOnce({ data: { url: 'https://s3/cert.pdf', expira_em: '2026' } });
    const resultado = await certificadosService.buscarUrlDownload('cert-1');
    expect(mockGet).toHaveBeenCalledWith('/api/certificados/cert-1/download');
    expect(resultado.url).toContain('s3');
  });
});
