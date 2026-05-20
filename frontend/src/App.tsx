import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
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
import { Verificar } from './pages/Verificar';
import { NaoEncontrado } from './pages/NaoEncontrado';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
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
                  <Route path="*" element={<NaoEncontrado />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
