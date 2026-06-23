import { type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import type { Usuario } from '../../types';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface Options {
  route?: string;
  token?: string;
  usuario?: Usuario;
}

export function renderWithProviders(ui: ReactNode, options: Options = {}) {
  const { route = '/', usuario } = options;

  if (usuario) {
    localStorage.setItem('usuario', JSON.stringify(usuario));
  }

  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[route]}>
              {ui}
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

export const USUARIO_ESTUDANTE: Usuario = {
  id: 'u-1', nome: 'João Estudante', email: 'joao@test.com', perfil: 'estudante',
  matricula: '2021001', cpf: null, endereco: null, curso_id: 'c-1',
  instituicao_id: 'i-1', instituicao_nome: 'Universidade Teste', ativo: true,
};

export const USUARIO_ADMIN: Usuario = {
  ...USUARIO_ESTUDANTE, id: 'admin-1', nome: 'Admin', email: 'admin@test.com', perfil: 'admin',
};

export const USUARIO_COORD: Usuario = {
  ...USUARIO_ESTUDANTE, id: 'coord-1', nome: 'Coord', email: 'coord@test.com', perfil: 'coordenador',
};
