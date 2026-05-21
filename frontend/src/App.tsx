import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Documentos } from './pages/Documentos';
import { DetalheDocumento } from './pages/DetalheDocumento';
import { SubmeterDocumento } from './pages/SubmeterDocumento';
import { MeusCertificados } from './pages/MeusCertificados';
import { Perfil } from './pages/Perfil';
import { Cadastro } from './pages/Cadastro';
import { Usuarios } from './pages/Usuarios';
import { Instituicoes } from './pages/Instituicoes';
import { Cursos } from './pages/Cursos';
import { Verificar } from './pages/Verificar';
import { NaoEncontrado } from './pages/NaoEncontrado';

function TelaCarregamento() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      <p className="mt-4 text-sm text-gray-500">Carregando...</p>
    </div>
  );
}

function AppRoutes() {
  const { transitioning } = useAuth();

  if (transitioning) return <TelaCarregamento />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/verificar/:hash" element={<Verificar />} />

        {/* Rotas autenticadas */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/documentos/:id" element={<DetalheDocumento />} />
            <Route
              path="/documentos/novo"
              element={
                <PrivateRoute perfis={['estudante']}>
                  <SubmeterDocumento />
                </PrivateRoute>
              }
            />
            <Route
              path="/certificados"
              element={
                <PrivateRoute perfis={['estudante']}>
                  <MeusCertificados />
                </PrivateRoute>
              }
            />
            <Route path="/perfil" element={<Perfil />} />
            <Route
              path="/usuarios"
              element={
                <PrivateRoute perfis={['admin']}>
                  <Usuarios />
                </PrivateRoute>
              }
            />
            <Route
              path="/instituicoes"
              element={
                <PrivateRoute perfis={['admin']}>
                  <Instituicoes />
                </PrivateRoute>
              }
            />
            <Route
              path="/cursos"
              element={
                <PrivateRoute perfis={['admin']}>
                  <Cursos />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<NaoEncontrado />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
