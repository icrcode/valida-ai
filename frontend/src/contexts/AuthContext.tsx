import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Usuario } from '../types';
import { queryClient } from '../lib/queryClient';
import api from '../services/api';

interface AuthState {
  usuario: Usuario | null;
}

interface AuthContextValue extends AuthState {
  login: (usuario: Usuario) => void;
  logout: () => void;
  isAuthenticated: boolean;
  transitioning: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function carregarEstadoInicial(): AuthState {
  const raw = localStorage.getItem('usuario');
  const usuario = raw ? (JSON.parse(raw) as Usuario) : null;
  return { usuario };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(carregarEstadoInicial);
  const [transitioning, setTransitioning] = useState(false);

  const login = useCallback((usuario: Usuario) => {
    queryClient.clear();
    setTransitioning(true);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setState({ usuario });
    requestAnimationFrame(() => requestAnimationFrame(() => setTransitioning(false)));
  }, []);

  const logout = useCallback(() => {
    api.post('/api/auth/logout').catch(() => {});
    queryClient.clear();
    localStorage.removeItem('usuario');
    setState({ usuario: null });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, isAuthenticated: !!state.usuario, transitioning }}
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
