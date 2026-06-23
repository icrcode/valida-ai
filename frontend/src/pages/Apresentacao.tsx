import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { id: 'inicio', label: 'Início' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'beneficios', label: 'Benefícios' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'contato', label: 'Contato' },
];

const funcionalidades = [
  {
    titulo: 'Envio de Certificados',
    descricao: 'Anexe certificados de cursos, eventos, estágios e atividades complementares em poucos cliques, direto pelo computador ou celular.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4m-7 5h10a2 2 0 002-2V7.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0012.586 2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
    ),
  },
  {
    titulo: 'Validação por Coordenadores',
    descricao: 'Coordenadores de cada curso analisam, aprovam ou solicitam ajustes nos documentos enviados pelos estudantes.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l1.5 1.5 3-3.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    titulo: 'Verificação Pública',
    descricao: 'Cada certificado validado recebe um link único com QR Code, que pode ser compartilhado para comprovar sua autenticidade.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    ),
  },
  {
    titulo: 'Multi-Instituição',
    descricao: 'Suporte a múltiplas instituições de ensino, com cursos e usuários organizados de forma independente e segura.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15" />
    ),
  },
  {
    titulo: 'Dashboard Inteligente',
    descricao: 'Painel com visão geral de documentos pendentes, aprovados e rejeitados, com filtros e estatísticas em tempo real.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    ),
  },
  {
    titulo: 'Geração de Certificados',
    descricao: 'Gere certificados de atividades complementares com QR Code de verificação automática e assinatura do coordenador.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    ),
  },
];

const beneficios = [
  {
    titulo: 'Para Estudantes',
    items: [
      'Envie certificados de qualquer lugar, a qualquer hora',
      'Acompanhe o status de validação em tempo real',
      'Compartilhe certificados validados com link verificável',
      'Histórico completo de todas as atividades complementares',
    ],
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    ),
  },
  {
    titulo: 'Para Coordenadores',
    items: [
      'Fila organizada de documentos para análise',
      'Aprovação ou rejeição com feedback detalhado',
      'Visão completa dos alunos e seus certificados',
      'Assinatura digital automática nos certificados gerados',
    ],
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    ),
  },
  {
    titulo: 'Para Instituições',
    items: [
      'Gestão centralizada de cursos e coordenadores',
      'Redução de processos burocráticos e uso de papel',
      'Rastreabilidade completa de todos os documentos',
      'Relatórios e métricas de atividades complementares',
    ],
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    ),
  },
];

const segurancaItems = [
  {
    titulo: 'Criptografia TLS 1.2/1.3',
    descricao: 'Todas as comunicações são protegidas com criptografia de ponta a ponta usando os protocolos mais recentes.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    ),
  },
  {
    titulo: 'Autenticação Segura',
    descricao: 'Login com JWT tokens, senhas criptografadas com bcrypt e suporte a autenticação via Microsoft OAuth.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    ),
  },
  {
    titulo: 'Controle de Acesso por Perfil',
    descricao: 'Três níveis de acesso (estudante, coordenador, admin) com permissões granulares para cada funcionalidade.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    ),
  },
  {
    titulo: 'QR Code Verificável',
    descricao: 'Cada certificado possui um QR Code único que permite verificação instantânea da autenticidade por qualquer pessoa.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    ),
  },
  {
    titulo: 'HSTS & Headers de Segurança',
    descricao: 'Proteção contra ataques com Strict-Transport-Security, Helmet.js e headers de segurança configurados no servidor.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    ),
  },
  {
    titulo: 'Armazenamento Seguro',
    descricao: 'Documentos armazenados com segurança na AWS S3 com acesso controlado e URLs assinadas temporárias.',
    icone: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    ),
  },
];

function useActiveSection() {
  const [active, setActive] = useState('inicio');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActive(top.target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return active;
}

function SectionHeading({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-block rounded-full border border-[#618C7C]/30 bg-[#011140] px-4 py-1.5 text-xs font-medium text-[#618C7C]">
        {badge}
      </span>
      <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl md:text-4xl">{title}</h2>
      <p className="mt-3 text-sm text-white/50 sm:text-base">{subtitle}</p>
    </div>
  );
}

export function Apresentacao() {
  const { isAuthenticated } = useAuth();
  const activeSection = useActiveSection();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#010A26]">
      {/* ── Navbar fixa ── */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-white/8 bg-[#010A26]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <button onClick={() => scrollTo('inicio')} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#618C7C]/30 bg-[#011140]">
              <svg className="h-5 w-5 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">
              Valida<span className="text-[#618C7C]">AI</span>
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeSection === id
                    ? 'bg-[#618C7C]/15 text-[#618C7C]'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-white/80 transition-all hover:border-[#618C7C]/40 hover:text-white"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="hidden rounded-lg bg-[#618C7C] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#7AAA9A] sm:block"
            >
              Criar conta
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 md:hidden"
            >
              <svg className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="animate-fade-in border-t border-white/8 bg-[#010A26] md:hidden">
            <div className="flex flex-col gap-1 px-5 py-4">
              {NAV_ITEMS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all ${
                    activeSection === id
                      ? 'bg-[#618C7C]/15 text-[#618C7C]'
                      : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                  }`}
                >
                  {label}
                </button>
              ))}
              <Link
                to="/cadastro"
                className="mt-2 rounded-lg bg-[#618C7C] px-4 py-2.5 text-center text-sm font-medium text-white transition-all hover:bg-[#7AAA9A]"
              >
                Criar conta
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Início / Hero ── */}
      <section id="inicio" className="flex min-h-screen items-center justify-center px-4 pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-fade-up">
            <span className="inline-block rounded-full border border-[#618C7C]/30 bg-[#011140] px-4 py-1.5 text-xs font-medium text-[#618C7C]">
              Plataforma de validação acadêmica
            </span>

            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Centralize e valide os{' '}
              <span className="text-[#618C7C]">
                certificados acadêmicos
              </span>{' '}
              da sua instituição
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base text-white/50 sm:text-lg">
              O ValidaAI conecta estudantes e coordenadores em um único lugar: envie certificados
              de cursos, eventos e atividades complementares, e tenha cada documento
              validado com segurança e rastreabilidade.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/cadastro"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#618C7C] px-8 py-3 text-base font-semibold text-white transition-all hover:bg-[#7AAA9A] hover:shadow-[0_0_32px_rgba(97,140,124,0.35)] focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:ring-offset-2 focus:ring-offset-[#010A26] sm:w-auto"
              >
                Começar agora
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                to="/login"
                className="w-full rounded-xl border border-white/10 px-8 py-3 text-base font-medium text-white/80 transition-all hover:border-[#618C7C]/40 hover:text-white sm:w-auto"
              >
                Já tenho uma conta
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="animate-fade-up delay-300 mt-16 grid grid-cols-3 gap-4 sm:gap-8">
            {[
              { value: '100%', label: 'Digital' },
              { value: 'QR Code', label: 'Verificável' },
              { value: '24/7', label: 'Disponível' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/8 bg-[#011140]/50 px-4 py-4 sm:px-6">
                <div className="text-xl font-bold text-[#618C7C] sm:text-2xl">{stat.value}</div>
                <div className="mt-1 text-xs text-white/40 sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <button
          onClick={() => scrollTo('funcionalidades')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/30 transition-colors hover:text-white/60"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </section>

      {/* ── Funcionalidades ── */}
      <section id="funcionalidades" className="relative px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            badge="Funcionalidades"
            title="Tudo que você precisa em um só lugar"
            subtitle="Uma plataforma completa para gestão de certificados e atividades complementares."
          />

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {funcionalidades.map((item, i) => (
              <div
                key={item.titulo}
                className="animate-fade-up group rounded-2xl border border-white/8 bg-[#011140]/60 p-6 transition-all hover:border-[#618C7C]/25 hover:bg-[#011140]"
                style={{ animationDelay: `${i * 75}ms` }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#618C7C]/25 bg-[#618C7C]/10 transition-colors group-hover:bg-[#618C7C]/20">
                  <svg className="h-5 w-5 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {item.icone}
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">{item.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">{item.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefícios ── */}
      <section id="beneficios" className="px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            badge="Benefícios"
            title="Vantagens para cada perfil"
            subtitle="O ValidaAI foi projetado pensando em cada tipo de usuário da instituição."
          />

          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {beneficios.map((grupo, i) => (
              <div
                key={grupo.titulo}
                className="animate-fade-up rounded-2xl border border-white/8 bg-[#011140]/60 p-6 sm:p-8"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#618C7C]/25 bg-[#618C7C]/10">
                    <svg className="h-5 w-5 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      {grupo.icone}
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{grupo.titulo}</h3>
                </div>
                <ul className="space-y-3">
                  {grupo.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-white/50">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Segurança ── */}
      <section id="seguranca" className="relative px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            badge="Segurança"
            title="Seus dados estão protegidos"
            subtitle="Utilizamos as melhores práticas de segurança para proteger seus documentos e informações."
          />

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {segurancaItems.map((item, i) => (
              <div
                key={item.titulo}
                className="animate-fade-up group rounded-2xl border border-white/8 bg-[#011140]/60 p-6 transition-all hover:border-[#618C7C]/25 hover:bg-[#011140]"
                style={{ animationDelay: `${i * 75}ms` }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#618C7C]/25 bg-[#618C7C]/10 transition-colors group-hover:bg-[#618C7C]/20">
                  <svg className="h-5 w-5 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {item.icone}
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">{item.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">{item.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contato ── */}
      <section id="contato" className="px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading
            badge="Contato"
            title="Entre em contato"
            subtitle="Este projeto é desenvolvido como Trabalho de Conclusão de Curso (TCC)."
          />

          <div className="mt-10 rounded-2xl border border-white/8 bg-[#011140]/60 p-8 sm:p-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#618C7C]/25 bg-[#618C7C]/10">
              <svg className="h-8 w-8 text-[#618C7C]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>

            <p className="text-sm leading-relaxed text-white/50 sm:text-base">
              O <span className="font-semibold text-white">ValidaAI</span> é um projeto acadêmico desenvolvido como
              Trabalho de Conclusão de Curso (TCC). Para dúvidas, sugestões ou interesse em
              colaborar, entre em contato pelo GitHub:
            </p>

            <a
              href="https://github.com/icrcode"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#618C7C] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#7AAA9A] hover:shadow-[0_0_24px_rgba(97,140,124,0.3)]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              github.com/icrcode
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#618C7C]/30 bg-[#011140]">
              <svg className="h-4 w-4 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">
              Valida<span className="text-[#618C7C]">AI</span>
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-xs text-white/40 transition-colors hover:text-white/70"
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} ValidaAI
          </p>
        </div>
      </footer>
    </div>
  );
}
