import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Documentos } from './pages/Documentos';
import { DetalheDocumento } from './pages/DetalheDocumento';
import { SubmeterDocumento } from './pages/SubmeterDocumento';
import { MeusCertificados } from './pages/MeusCertificados';
import { Perfil } from './pages/Perfil';
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
        <BrowserRouter>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/verificar/:hash" element={<Verificar />} />

            {/* Rotas protegidas com layout */}
            <Route element={<PrivateRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/documentos" element={<Documentos />} />
                <Route path="/documentos/:id" element={<DetalheDocumento />} />
                <Route
                  path="/documentos/novo"
                  element={<PrivateRoute perfis={['estudante']} />}
                >
                  <Route index element={<SubmeterDocumento />} />
                </Route>
                <Route
                  path="/certificados"
                  element={<PrivateRoute perfis={['estudante']} />}
                >
                  <Route index element={<MeusCertificados />} />
                </Route>
                <Route path="/perfil" element={<Perfil />} />
                <Route path="*" element={<NaoEncontrado />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
