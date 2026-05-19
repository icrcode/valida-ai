import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ToastContainer } from './ToastContainer';
import { PERFIL_LABEL, PERFIL_COR, iniciais } from '../utils/perfil';

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
  }`;

export function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  const eEstudante = usuario?.perfil === 'estudante';
  const eCoordenador = usuario?.perfil === 'coordenador' || usuario?.perfil === 'admin';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navLinks = (mobile = false) => (
    <>
      <NavLink
        to="/dashboard"
        className={linkCls}
        onClick={mobile ? () => setMenuAberto(false) : undefined}
      >
        Início
      </NavLink>
      <NavLink
        to="/documentos"
        className={linkCls}
        onClick={mobile ? () => setMenuAberto(false) : undefined}
      >
        Documentos
      </NavLink>
      {eEstudante && (
        <NavLink
          to="/certificados"
          className={linkCls}
          onClick={mobile ? () => setMenuAberto(false) : undefined}
        >
          Certificados
        </NavLink>
      )}
      {eCoordenador && (
        <NavLink
          to="/documentos?status=pendente"
          className={linkCls}
          onClick={mobile ? () => setMenuAberto(false) : undefined}
        >
          Fila de Análise
        </NavLink>
      )}
      <NavLink
        to="/perfil"
        className={linkCls}
        onClick={mobile ? () => setMenuAberto(false) : undefined}
      >
        Perfil
      </NavLink>
      {usuario?.perfil === 'admin' && (
        <NavLink
          to="/usuarios"
          className={linkCls}
          onClick={mobile ? () => setMenuAberto(false) : undefined}
        >
          Usuários
        </NavLink>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 text-lg font-bold text-blue-700"
          >
            <svg
              className="h-6 w-6 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Valida<span className="text-blue-500">AI</span>
            </span>
          </NavLink>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-1 md:flex">{navLinks()}</nav>

          {/* Usuário + logout */}
          <div className="flex items-center gap-2">
            {/* Avatar + info */}
            <NavLink
              to="/perfil"
              className="hidden items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50 sm:flex"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {usuario?.nome ? iniciais(usuario.nome) : '?'}
              </div>
              <div className="hidden flex-col leading-tight lg:flex">
                <span className="max-w-[140px] truncate text-sm font-medium text-gray-800">
                  {usuario?.nome}
                </span>
                <span
                  className={`self-start rounded px-1.5 py-px text-xs font-medium ${
                    PERFIL_COR[usuario?.perfil ?? ''] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {PERFIL_LABEL[usuario?.perfil ?? ''] ?? usuario?.perfil}
                </span>
              </div>
            </NavLink>

            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              Sair
            </button>

            {/* Botão hamburger mobile */}
            <button
              onClick={() => setMenuAberto((v) => !v)}
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            >
              {menuAberto ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuAberto && (
          <nav className="border-t border-gray-100 px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">{navLinks(true)}</div>
            {/* Info do usuário no mobile */}
            <div className="mt-3 border-t border-gray-100 pt-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white flex-shrink-0">
                {usuario?.nome ? iniciais(usuario.nome) : '?'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">{usuario?.nome}</p>
                <p className="text-xs text-gray-500">{usuario?.email}</p>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  );
}
