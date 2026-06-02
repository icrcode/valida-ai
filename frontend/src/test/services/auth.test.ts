import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../services/auth';

vi.mock('../../services/api');

import api from '../../services/api';

const mockApi = api as { post: ReturnType<typeof vi.fn> };

const USUARIO_MOCK = {
  id: 'u-1', nome: 'João', email: 'joao@test.com', perfil: 'estudante' as const,
  matricula: null, cpf: null, endereco: null, curso_id: 'c-1',
  instituicao_id: 'i-1', instituicao_nome: 'UT', ativo: true,
  criado_em: '', atualizado_em: '',
};

beforeEach(() => vi.clearAllMocks());

describe('authService.login', () => {
  it('chama POST /api/auth/login e retorna token e usuario', async () => {
    const resposta = { token: 'tok-123', usuario: USUARIO_MOCK };
    mockApi.post.mockResolvedValueOnce({ data: resposta });

    const resultado = await authService.login('joao@test.com', 'senha123');

    expect(mockApi.post).toHaveBeenCalledWith('/api/auth/login', { email: 'joao@test.com', senha: 'senha123' });
    expect(resultado.token).toBe('tok-123');
    expect(resultado.usuario.email).toBe('joao@test.com');
  });
});

describe('authService.cadastrar', () => {
  it('chama POST /api/auth/cadastro e retorna token e usuario', async () => {
    const resposta = { token: 'tok-456', usuario: USUARIO_MOCK };
    mockApi.post.mockResolvedValueOnce({ data: resposta });

    const resultado = await authService.cadastrar({
      nome: 'João', email: 'joao@test.com', senha: 'senha123',
      matricula: '2021001', curso_id: 'c-1',
    });

    expect(mockApi.post).toHaveBeenCalledWith('/api/auth/cadastro', expect.objectContaining({ nome: 'João' }));
    expect(resultado.token).toBe('tok-456');
  });
});
