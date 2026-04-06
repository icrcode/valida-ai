import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Perfil } from '../types';
import type { ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  perfis?: Perfil[];
}

/**
 * Usado de dois modos:
 * 1. Como `element` de uma Route pai (sem children) → renderiza <Outlet /> ao ser autenticado
 * 2. Como wrapper explícito (com children) → renderiza os filhos
 */
export function PrivateRoute({ children, perfis }: Props) {
  const { isAuthenticated, usuario } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (perfis && usuario && !perfis.includes(usuario.perfil)) {
    return <Navigate to="/documentos" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
