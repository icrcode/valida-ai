import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Documentos } from './pages/Documentos';
import { DetalheDocumento } from './pages/DetalheDocumento';
import { SubmeterDocumento } from './pages/SubmeterDocumento';
import { Perfil } from './pages/Perfil';

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
            <Route path="/login" element={<Login />} />

            {/* Rotas protegidas com layout */}
            <Route element={<PrivateRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/documentos" replace />} />
                <Route path="/documentos" element={<Documentos />} />
                <Route path="/documentos/:id" element={<DetalheDocumento />} />
                <Route
                  path="/documentos/novo"
                  element={<PrivateRoute perfis={['estudante']} />}
                >
                  <Route index element={<SubmeterDocumento />} />
                </Route>
                <Route path="/perfil" element={<Perfil />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/documentos" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
