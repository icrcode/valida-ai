import { describe, it, expect, vi, beforeEach } from 'vitest';
import { instituicoesService } from '../../services/instituicoes';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

import api from '../../services/api';
const mockApi = api as Record<string, ReturnType<typeof vi.fn>>;

const INST_MOCK = { id: 'i-1', nome: 'Universidade Teste', sigla: 'UT', ativa: true };

beforeEach(() => vi.clearAllMocks());

describe('instituicoesService.listar', () => {
  it('chama GET /api/instituicoes', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [INST_MOCK] });
    const resultado = await instituicoesService.listar();
    expect(mockApi.get).toHaveBeenCalledWith('/api/instituicoes');
    expect(resultado).toHaveLength(1);
  });
});

describe('instituicoesService.criar', () => {
  it('chama POST /api/instituicoes', async () => {
    mockApi.post.mockResolvedValueOnce({ data: INST_MOCK });
    await instituicoesService.criar({ nome: 'Universidade Teste', sigla: 'UT' });
    expect(mockApi.post).toHaveBeenCalledWith('/api/instituicoes', expect.objectContaining({ nome: 'Universidade Teste' }));
  });
});

describe('instituicoesService.atualizar', () => {
  it('chama PUT /api/instituicoes/:id', async () => {
    mockApi.put.mockResolvedValueOnce({ data: INST_MOCK });
    await instituicoesService.atualizar('i-1', { nome: 'Novo Nome' });
    expect(mockApi.put).toHaveBeenCalledWith('/api/instituicoes/i-1', { nome: 'Novo Nome' });
  });
});

describe('instituicoesService.alterarAtiva', () => {
  it('chama PATCH /api/instituicoes/:id/ativa', async () => {
    mockApi.patch.mockResolvedValueOnce({ data: { ...INST_MOCK, ativa: false } });
    await instituicoesService.alterarAtiva('i-1', false);
    expect(mockApi.patch).toHaveBeenCalledWith('/api/instituicoes/i-1/ativa', { ativa: false });
  });
});
