import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PrivateRoute } from '../../components/PrivateRoute';
import { AuthProvider } from '../../contexts/AuthContext';
import type { Usuario } from '../../types';

const USUARIO_MOCK: Usuario = {
  id: 'u-1', nome: 'Admin', email: 'a@test.com', perfil: 'admin',
  matricula: null, cpf: null, endereco: null, curso_id: null,
  instituicao_id: 'i-1', instituicao_nome: 'UT', ativo: true,
  criado_em: '', atualizado_em: '',
};

function renderComAuth(token: string | null, usuario: Usuario | null, perfis?: string[]) {
  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }

  return render(
    <MemoryRouter initialEntries={['/protegido']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Página de Login</div>} />
          <Route path="/documentos" element={<div>Documentos</div>} />
          <Route
            path="/protegido"
            element={
              <PrivateRoute perfis={perfis as any}>
                <div>Conteúdo Protegido</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('PrivateRoute', () => {
  beforeEach(() => localStorage.clear());

  it('redireciona para /login quando não autenticado', () => {
    renderComAuth(null, null);
    expect(screen.getByText('Página de Login')).toBeInTheDocument();
  });

  it('renderiza conteúdo quando autenticado', () => {
    renderComAuth('tok-123', USUARIO_MOCK);
    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument();
  });

  it('redireciona para /documentos quando perfil não está na lista', () => {
    renderComAuth('tok-123', USUARIO_MOCK, ['estudante']);
    expect(screen.getByText('Documentos')).toBeInTheDocument();
  });

  it('renderiza conteúdo quando perfil está na lista', () => {
    renderComAuth('tok-123', USUARIO_MOCK, ['admin']);
    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument();
  });
});
