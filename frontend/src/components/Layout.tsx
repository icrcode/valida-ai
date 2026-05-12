import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
  }`;

export function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const eEstudante = usuario?.perfil === 'estudante';
  const eCoordenador = usuario?.perfil === 'coordenador' || usuario?.perfil === 'admin';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <NavLink to="/dashboard" className="text-lg font-semibold text-blue-700">
            Valida AI
          </NavLink>

          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard" className={linkClass}>
              Início
            </NavLink>
            <NavLink to="/documentos" className={linkClass}>
              Documentos
            </NavLink>
            {eEstudante && (
              <NavLink to="/certificados" className={linkClass}>
                Certificados
              </NavLink>
            )}
            {eCoordenador && (
              <NavLink to="/documentos?status=pendente" className={linkClass}>
                Fila de Análise
              </NavLink>
            )}
            <NavLink to="/perfil" className={linkClass}>
              Perfil
            </NavLink>
            {usuario?.perfil === 'admin' && (
              <NavLink to="/usuarios" className={linkClass}>
                Usuários
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{usuario?.nome}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
