import { describe, it, expect, vi, beforeEach } from 'vitest';
import { documentosService } from '../../services/documentos';

vi.mock('../../services/api');

import api from '../../services/api';
const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const DOC_MOCK = { id: 'doc-1', titulo: 'Estágio', status: 'pendente' };

beforeEach(() => vi.clearAllMocks());

describe('documentosService.listar', () => {
  it('chama GET /api/documentos sem filtros', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { dados: [DOC_MOCK], total: 1 } });
    const resultado = await documentosService.listar();
    expect(mockApi.get).toHaveBeenCalledWith('/api/documentos', { params: {} });
    expect(resultado.total).toBe(1);
  });

  it('passa filtros como query params (status e page)', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { dados: [], total: 0 } });
    await documentosService.listar({ status: 'aprovado', page: 2 });
    expect(mockApi.get).toHaveBeenCalledWith('/api/documentos', {
      params: { status: 'aprovado', page: 2 },
    });
  });

  it('passa filtro de tipo', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { dados: [], total: 0 } });
    await documentosService.listar({ tipo: 'certificado_curso' });
    expect(mockApi.get).toHaveBeenCalledWith('/api/documentos', {
      params: { tipo: 'certificado_curso' },
    });
  });

  it('passa filtro de estudante_id', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { dados: [], total: 0 } });
    await documentosService.listar({ estudante_id: 'u-1' });
    expect(mockApi.get).toHaveBeenCalledWith('/api/documentos', {
      params: { estudante_id: 'u-1' },
    });
  });

  it('passa filtro de limite', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { dados: [], total: 0 } });
    await documentosService.listar({ limite: 10 });
    expect(mockApi.get).toHaveBeenCalledWith('/api/documentos', {
      params: { limite: 10 },
    });
  });
});

describe('documentosService.buscarPorId', () => {
  it('chama GET /api/documentos/:id', async () => {
    mockApi.get.mockResolvedValueOnce({ data: DOC_MOCK });
    const resultado = await documentosService.buscarPorId('doc-1');
    expect(mockApi.get).toHaveBeenCalledWith('/api/documentos/doc-1');
    expect(resultado.id).toBe('doc-1');
  });
});

describe('documentosService.buscarUrlDownload', () => {
  it('chama GET /api/documentos/:id/download', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { url: 'https://s3.aws/file.pdf', expira_em: '2026' } });
    const resultado = await documentosService.buscarUrlDownload('doc-1');
    expect(mockApi.get).toHaveBeenCalledWith('/api/documentos/doc-1/download');
    expect(resultado.url).toContain('s3');
  });
});

describe('documentosService.cancelar', () => {
  it('chama DELETE /api/documentos/:id', async () => {
    mockApi.delete.mockResolvedValueOnce({ data: undefined });
    await documentosService.cancelar('doc-1');
    expect(mockApi.delete).toHaveBeenCalledWith('/api/documentos/doc-1');
  });
});

describe('documentosService.aprovar', () => {
  it('chama PATCH /api/documentos/:id/aprovar', async () => {
    mockApi.patch.mockResolvedValueOnce({ data: { ...DOC_MOCK, status: 'aprovado' } });
    const resultado = await documentosService.aprovar('doc-1', 'Documentação ok');
    expect(mockApi.patch).toHaveBeenCalledWith('/api/documentos/doc-1/aprovar', { observacoes: 'Documentação ok' });
    expect(resultado.status).toBe('aprovado');
  });
});

describe('documentosService.reprovar', () => {
  it('chama PATCH /api/documentos/:id/reprovar', async () => {
    mockApi.patch.mockResolvedValueOnce({ data: { ...DOC_MOCK, status: 'reprovado' } });
    await documentosService.reprovar('doc-1', 'Incompleto');
    expect(mockApi.patch).toHaveBeenCalledWith('/api/documentos/doc-1/reprovar', { observacoes: 'Incompleto' });
  });
});

describe('documentosService.solicitarRevisao', () => {
  it('chama PATCH /api/documentos/:id/solicitar-revisao', async () => {
    mockApi.patch.mockResolvedValueOnce({ data: { ...DOC_MOCK, status: 'revisao_solicitada' } });
    await documentosService.solicitarRevisao('doc-1', 'Ajustar data');
    expect(mockApi.patch).toHaveBeenCalledWith('/api/documentos/doc-1/solicitar-revisao', { observacoes: 'Ajustar data' });
  });
});

describe('documentosService.historico', () => {
  it('chama GET /api/documentos/:id/historico', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] });
    const resultado = await documentosService.historico('doc-1');
    expect(mockApi.get).toHaveBeenCalledWith('/api/documentos/doc-1/historico');
    expect(Array.isArray(resultado)).toBe(true);
  });
});
