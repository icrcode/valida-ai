import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ToastContainer } from './ToastContainer';
import { PERFIL_LABEL, PERFIL_COR, iniciais } from '../utils/perfil';
import { SunIcon, MoonIcon } from './icons';

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'bg-[#618C7C]/15 text-[#7AAA9A] border border-[#618C7C]/25'
      : 'text-white/55 border border-transparent hover:text-white hover:bg-white/5'
  }`;

export function Layout() {
  const { usuario, logout } = useAuth();
  const { tema, alternar } = useTheme();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);


  const eEstudante = usuario?.perfil === 'estudante';
  const eCoordenadorPuro = usuario?.perfil === 'coordenador';
  const eCoordenador = eCoordenadorPuro || usuario?.perfil === 'admin';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navLinks = (mobile = false) => (
    <>
      <NavLink to="/dashboard" className={linkCls} onClick={mobile ? () => setMenuAberto(false) : undefined}>
        Início
      </NavLink>
      <NavLink to="/documentos" className={linkCls} onClick={mobile ? () => setMenuAberto(false) : undefined}>
        Documentos
      </NavLink>
      {eEstudante && (
        <NavLink to="/certificados" className={linkCls} onClick={mobile ? () => setMenuAberto(false) : undefined}>
          Certificados
        </NavLink>
      )}
      {eCoordenador && (
        <NavLink to="/documentos?status=pendente" className={linkCls} onClick={mobile ? () => setMenuAberto(false) : undefined}>
          Fila de Análise
        </NavLink>
      )}
      {eCoordenadorPuro && (
        <NavLink to="/alunos" className={linkCls} onClick={mobile ? () => setMenuAberto(false) : undefined}>
          Alunos
        </NavLink>
      )}
      <NavLink to="/perfil" className={linkCls} onClick={mobile ? () => setMenuAberto(false) : undefined}>
        Perfil
      </NavLink>
      {usuario?.perfil === 'admin' && (
        <>
          <NavLink to="/usuarios" className={linkCls} onClick={mobile ? () => setMenuAberto(false) : undefined}>
            Usuários
          </NavLink>
          <NavLink to="/instituicoes" className={linkCls} onClick={mobile ? () => setMenuAberto(false) : undefined}>
            Instituições
          </NavLink>
          <NavLink to="/cursos" className={linkCls} onClick={mobile ? () => setMenuAberto(false) : undefined}>
            Cursos
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-[#010A26]">
      {/* Header */}
      <header className="nav-header-bg sticky top-0 z-10 border-b border-white/8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-3 text-xl font-bold text-white group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#618C7C]/20 border border-[#618C7C]/30 transition-all group-hover:bg-[#618C7C]/30">
              <svg className="h-5 w-5 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span>Valida<span className="text-[#618C7C]">AI</span></span>
          </NavLink>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-1 md:flex">{navLinks()}</nav>

          {/* Ações do header */}
          <div className="flex items-center gap-2">
            {/* Botão tema */}
            <button
              onClick={alternar}
              aria-label={tema === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              title={tema === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="rounded-lg p-2.5 text-white/50 hover:bg-white/5 hover:text-white transition-all"
            >
              {tema === 'dark'
                ? <SunIcon className="h-5 w-5" aria-hidden />
                : <MoonIcon className="h-5 w-5" aria-hidden />}
            </button>

            <NavLink
              to="/perfil"
              className="hidden items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-white/5 sm:flex"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#618C7C] text-sm font-bold ring-2 ring-[#618C7C]/30"
                style={{ color: 'white' }}
              >
                {usuario?.nome ? iniciais(usuario.nome) : '?'}
              </div>
              <div className="hidden flex-col leading-tight lg:flex">
                <span className="max-w-[140px] truncate text-sm font-medium text-white">
                  {usuario?.nome}
                </span>
                <span className={`self-start rounded-full px-2 py-px text-xs font-medium ${PERFIL_COR[usuario?.perfil ?? ''] ?? 'bg-white/10 text-white/60'}`}>
                  {PERFIL_LABEL[usuario?.perfil ?? ''] ?? usuario?.perfil}
                </span>
              </div>
            </NavLink>

            <button
              onClick={handleLogout}
              className="rounded-lg px-4 py-2.5 text-sm text-white/50 hover:bg-white/5 hover:text-white transition-all"
            >
              Sair
            </button>

            <button
              onClick={() => setMenuAberto((v) => !v)}
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              className="rounded-lg p-2.5 text-white/50 hover:bg-white/5 hover:text-white transition-all md:hidden"
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
          <nav className="nav-mobile-bg border-t border-white/8 px-5 py-4 md:hidden animate-fade-up">
            <div className="flex flex-col gap-1">{navLinks(true)}</div>
            <div className="mt-4 border-t border-white/8 pt-4 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#618C7C] text-sm font-bold flex-shrink-0"
                style={{ color: 'white' }}
              >
                {usuario?.nome ? iniciais(usuario.nome) : '?'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{usuario?.nome}</p>
                <p className="text-xs text-white/40">{usuario?.email}</p>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 animate-fade-up">
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  );
}
