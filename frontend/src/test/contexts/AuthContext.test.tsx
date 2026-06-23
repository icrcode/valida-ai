import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import type { Usuario } from '../../types';

vi.mock('../../services/api', () => ({
  default: { post: vi.fn().mockResolvedValue({}) },
}));

const USUARIO_MOCK: Usuario = {
  id: 'u-1',
  nome: 'João Silva',
  email: 'joao@test.com',
  perfil: 'estudante',
  matricula: '2021001',
  cpf: null,
  endereco: null,
  curso_id: 'curso-1',
  instituicao_id: 'inst-1',
  instituicao_nome: 'Universidade Teste',
  ativo: true,
};

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="autenticado">{String(auth.isAuthenticated)}</span>
      <span data-testid="nome">{auth.usuario?.nome ?? 'sem-usuario'}</span>
      <button onClick={() => auth.login(USUARIO_MOCK)}>login</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('AuthContext', () => {
  it('inicia não autenticado quando não há usuario no localStorage', () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('autenticado').textContent).toBe('false');
  });

  it('inicia autenticado quando há usuario no localStorage', () => {
    localStorage.setItem('usuario', JSON.stringify(USUARIO_MOCK));
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('autenticado').textContent).toBe('true');
  });

  it('faz login corretamente', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => {
      screen.getByText('login').click();
    });
    expect(screen.getByTestId('autenticado').textContent).toBe('true');
    expect(screen.getByTestId('nome').textContent).toBe('João Silva');
    expect(localStorage.getItem('usuario')).toBeTruthy();
  });

  it('faz logout corretamente', async () => {
    localStorage.setItem('usuario', JSON.stringify(USUARIO_MOCK));
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => {
      screen.getByText('logout').click();
    });
    expect(screen.getByTestId('autenticado').textContent).toBe('false');
    expect(localStorage.getItem('usuario')).toBeNull();
  });

  it('lança erro quando useAuth é usado fora do AuthProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow('useAuth deve ser usado dentro de AuthProvider');
    console.error = consoleError;
  });
});
