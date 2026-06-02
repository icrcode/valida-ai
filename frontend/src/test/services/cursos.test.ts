import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cursosService } from '../../services/cursos';

vi.mock('../../services/api');

import api from '../../services/api';
const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const CURSO_MOCK = { id: 'c-1', nome: 'CC', codigo: 'UT001', ativo: true };

beforeEach(() => vi.clearAllMocks());

describe('cursosService.listar', () => {
  it('chama GET /api/cursos', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [CURSO_MOCK] });
    const resultado = await cursosService.listar();
    expect(mockApi.get).toHaveBeenCalledWith('/api/cursos');
    expect(resultado).toHaveLength(1);
  });
});

describe('cursosService.listarAdmin', () => {
  it('chama GET /api/cursos/admin sem filtro', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] });
    await cursosService.listarAdmin();
    expect(mockApi.get).toHaveBeenCalledWith('/api/cursos/admin', { params: undefined });
  });

  it('passa instituicao_id como query param quando fornecido', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] });
    await cursosService.listarAdmin('inst-1');
    expect(mockApi.get).toHaveBeenCalledWith('/api/cursos/admin', { params: { instituicao_id: 'inst-1' } });
  });
});

describe('cursosService.criar', () => {
  it('chama POST /api/cursos com os dados', async () => {
    mockApi.post.mockResolvedValueOnce({ data: CURSO_MOCK });
    await cursosService.criar({ nome: 'CC', instituicao_id: 'inst-1' });
    expect(mockApi.post).toHaveBeenCalledWith('/api/cursos', expect.objectContaining({ nome: 'CC' }));
  });
});

describe('cursosService.atualizar', () => {
  it('chama PUT /api/cursos/:id', async () => {
    mockApi.put.mockResolvedValueOnce({ data: CURSO_MOCK });
    await cursosService.atualizar('c-1', { nome: 'Novo Nome' });
    expect(mockApi.put).toHaveBeenCalledWith('/api/cursos/c-1', { nome: 'Novo Nome' });
  });
});

describe('cursosService.alterarAtivo', () => {
  it('chama PATCH /api/cursos/:id/ativo', async () => {
    mockApi.patch.mockResolvedValueOnce({ data: { ...CURSO_MOCK, ativo: false } });
    await cursosService.alterarAtivo('c-1', false);
    expect(mockApi.patch).toHaveBeenCalledWith('/api/cursos/c-1/ativo', { ativo: false });
  });
});
