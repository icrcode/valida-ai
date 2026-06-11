import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';
import { Apresentacao } from './pages/Apresentacao';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Documentos } from './pages/Documentos';
import { DetalheDocumento } from './pages/DetalheDocumento';
import { SubmeterDocumento } from './pages/SubmeterDocumento';
import { MeusCertificados } from './pages/MeusCertificados';
import { Perfil } from './pages/Perfil';
import { Cadastro } from './pages/Cadastro';
import { Usuarios } from './pages/Usuarios';
import { Alunos } from './pages/Alunos';
import { Instituicoes } from './pages/Instituicoes';
import { Cursos } from './pages/Cursos';
import { Verificar } from './pages/Verificar';
import { NaoEncontrado } from './pages/NaoEncontrado';

function TelaCarregamento() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#010A26]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#618C7C]/20 border-t-[#618C7C]" />
      <p className="mt-4 text-sm text-white/40">Carregando...</p>
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
        <Route path="/" element={<Apresentacao />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/verificar/:hash" element={<Verificar />} />

        {/* Rotas autenticadas */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
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
              path="/alunos"
              element={
                <PrivateRoute perfis={['coordenador']}>
                  <Alunos />
                </PrivateRoute>
              }
            />
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
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
