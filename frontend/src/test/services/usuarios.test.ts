import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usuariosService } from '../../services/usuarios';

vi.mock('../../services/api');

import api from '../../services/api';
const mockApi = api as Record<string, ReturnType<typeof vi.fn>>;

const USR_MOCK = { id: 'u-1', nome: 'João', email: 'j@test.com', perfil: 'estudante' as const };

beforeEach(() => vi.clearAllMocks());

describe('usuariosService.getPerfil', () => {
  it('chama GET /api/usuarios/perfil', async () => {
    mockApi.get.mockResolvedValueOnce({ data: USR_MOCK });
    const resultado = await usuariosService.getPerfil();
    expect(mockApi.get).toHaveBeenCalledWith('/api/usuarios/perfil');
    expect(resultado.id).toBe('u-1');
  });
});

describe('usuariosService.atualizarPerfil', () => {
  it('chama PUT /api/usuarios/perfil com os dados', async () => {
    mockApi.put.mockResolvedValueOnce({ data: { ...USR_MOCK, nome: 'João Atualizado' } });
    const resultado = await usuariosService.atualizarPerfil({ nome: 'João Atualizado' });
    expect(mockApi.put).toHaveBeenCalledWith('/api/usuarios/perfil', { nome: 'João Atualizado' });
    expect(resultado.nome).toBe('João Atualizado');
  });
});

describe('usuariosService.listar', () => {
  it('chama GET /api/usuarios sem filtro', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [USR_MOCK] });
    const resultado = await usuariosService.listar();
    expect(mockApi.get).toHaveBeenCalledWith('/api/usuarios', { params: undefined });
    expect(resultado).toHaveLength(1);
  });

  it('passa instituicao_id como query param quando fornecido', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] });
    await usuariosService.listar('inst-1');
    expect(mockApi.get).toHaveBeenCalledWith('/api/usuarios', { params: { instituicao_id: 'inst-1' } });
  });
});

describe('usuariosService.criar', () => {
  it('chama POST /api/usuarios com os dados', async () => {
    mockApi.post.mockResolvedValueOnce({ data: USR_MOCK });
    await usuariosService.criar({ nome: 'João', email: 'j@test.com', senha: 'abc123', perfil: 'estudante' });
    expect(mockApi.post).toHaveBeenCalledWith('/api/usuarios', expect.objectContaining({ nome: 'João' }));
  });
});

describe('usuariosService.atualizar', () => {
  it('chama PUT /api/usuarios/:id', async () => {
    mockApi.put.mockResolvedValueOnce({ data: USR_MOCK });
    await usuariosService.atualizar('u-1', { nome: 'Novo Nome' });
    expect(mockApi.put).toHaveBeenCalledWith('/api/usuarios/u-1', { nome: 'Novo Nome' });
  });
});

describe('usuariosService.alterarAtivo', () => {
  it('chama PATCH /api/usuarios/:id/ativo', async () => {
    mockApi.patch.mockResolvedValueOnce({ data: { ...USR_MOCK, ativo: false } });
    await usuariosService.alterarAtivo('u-1', false);
    expect(mockApi.patch).toHaveBeenCalledWith('/api/usuarios/u-1/ativo', { ativo: false });
  });
});
