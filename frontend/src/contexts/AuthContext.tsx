import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Usuario } from '../types';
import { queryClient } from '../lib/queryClient';

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
  isAuthenticated: boolean;
  transitioning: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function carregarEstadoInicial(): AuthState {
  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('usuario');
  const usuario = raw ? (JSON.parse(raw) as Usuario) : null;
  return { token, usuario };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(carregarEstadoInicial);
  const [transitioning, setTransitioning] = useState(false);

  const login = useCallback((token: string, usuario: Usuario) => {
    // Limpa cache da sessão anterior antes de renderizar qualquer dado novo
    queryClient.clear();
    setTransitioning(true);
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setState({ token, usuario });
    // Aguarda dois frames: um para montar a tela de carregamento, outro para liberar
    requestAnimationFrame(() => requestAnimationFrame(() => setTransitioning(false)));
  }, []);

  const logout = useCallback(() => {
    queryClient.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setState({ token: null, usuario: null });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, isAuthenticated: !!state.token, transitioning }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
