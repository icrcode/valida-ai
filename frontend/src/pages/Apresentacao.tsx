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

const etapas = [
  { numero: '01', titulo: 'Cadastre-se', descricao: 'Crie sua conta como estudante em poucos segundos.' },
  { numero: '02', titulo: 'Envie', descricao: 'Anexe seus certificados e documentos acadêmicos.' },
  { numero: '03', titulo: 'Validação', descricao: 'O coordenador analisa e valida cada documento.' },
  { numero: '04', titulo: 'Compartilhe', descricao: 'Receba um link único com QR Code verificável.' },
];

const funcionalidades = [
  {
    titulo: 'Envio de Certificados',
    descricao: 'Anexe certificados de cursos, eventos, estágios e atividades complementares em poucos cliques.',
    icone: 'M9 12h6m-6 4h4m-7 5h10a2 2 0 002-2V7.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0012.586 2H6a2 2 0 00-2 2v14a2 2 0 002 2z',
  },
  {
    titulo: 'Validação por Coordenadores',
    descricao: 'Coordenadores analisam, aprovam ou solicitam ajustes nos documentos enviados.',
    icone: 'M9 12.75l1.5 1.5 3-3.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    titulo: 'Verificação Pública',
    descricao: 'Cada certificado validado recebe um link único com QR Code para comprovar autenticidade.',
    icone: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
  },
  {
    titulo: 'Multi-Instituição',
    descricao: 'Suporte a múltiplas instituições com cursos e usuários organizados de forma independente.',
    icone: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15',
  },
  {
    titulo: 'Dashboard Inteligente',
    descricao: 'Painel com visão geral de documentos, filtros e estatísticas em tempo real.',
    icone: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  },
  {
    titulo: 'Geração de Certificados',
    descricao: 'Gere certificados com QR Code de verificação automática e assinatura do coordenador.',
    icone: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
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
    icone: 'M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5',
    cor: '#618C7C',
  },
  {
    titulo: 'Para Coordenadores',
    items: [
      'Fila organizada de documentos para análise',
      'Aprovação ou rejeição com feedback detalhado',
      'Visão completa dos alunos e seus certificados',
      'Assinatura digital automática nos certificados gerados',
    ],
    icone: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
    cor: '#5B8DB8',
  },
  {
    titulo: 'Para Instituições',
    items: [
      'Gestão centralizada de cursos e coordenadores',
      'Redução de processos burocráticos e uso de papel',
      'Rastreabilidade completa de todos os documentos',
      'Relatórios e métricas de atividades complementares',
    ],
    icone: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z',
    cor: '#8B6BAE',
  },
];

const segurancaItems = [
  { titulo: 'Criptografia TLS 1.2/1.3', descricao: 'Comunicações protegidas com criptografia de ponta a ponta.', icone: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z' },
  { titulo: 'Autenticação Segura', descricao: 'JWT tokens, bcrypt e suporte a Microsoft OAuth.', icone: 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z' },
  { titulo: 'Controle de Acesso', descricao: 'Três perfis com permissões granulares.', icone: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z' },
  { titulo: 'QR Code Verificável', descricao: 'Verificação instantânea da autenticidade por qualquer pessoa.', icone: 'M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z' },
  { titulo: 'Headers de Segurança', descricao: 'HSTS, Helmet.js e proteção contra ataques comuns.', icone: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
  { titulo: 'Armazenamento S3', descricao: 'Documentos na AWS S3 com URLs assinadas temporárias.', icone: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125' },
];

function GridPattern({ className = '' }: { className?: string }) {
  return (
    <svg className={`pointer-events-none absolute text-white/[0.02] ${className}`} width="100%" height="100%">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

function FloatingShapes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="landing-float-slow absolute -top-20 -right-20 h-72 w-72 rounded-full border border-[#618C7C]/10 sm:h-96 sm:w-96" />
      <div className="landing-float-med absolute -bottom-16 -left-16 h-56 w-56 rounded-full border border-[#618C7C]/8 sm:h-80 sm:w-80" />
      <div className="landing-float-fast absolute top-1/3 right-1/4 h-3 w-3 rounded-full bg-[#618C7C]/20" />
      <div className="landing-float-med absolute top-2/3 left-1/4 h-2 w-2 rounded-full bg-[#618C7C]/15" />
      <div className="landing-float-slow absolute top-1/2 right-1/3 h-4 w-4 rounded-full border border-[#618C7C]/10" />
      {/* Corner accents */}
      <svg className="absolute top-20 left-8 h-24 w-24 text-[#618C7C]/8 sm:left-16 sm:h-32 sm:w-32" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
        <line x1="0" y1="50" x2="100" y2="50" />
        <line x1="50" y1="0" x2="50" y2="100" />
        <circle cx="50" cy="50" r="20" />
      </svg>
      <svg className="absolute right-8 bottom-20 h-20 w-20 text-[#618C7C]/6 sm:right-16 sm:h-28 sm:w-28" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="20" y="20" width="60" height="60" rx="8" />
        <circle cx="50" cy="50" r="8" />
      </svg>
    </div>
  );
}

function Icon({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

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
      <span className="inline-flex items-center gap-2 rounded-full border border-[#618C7C]/30 bg-[#011140] px-4 py-1.5 text-xs font-medium text-[#618C7C]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#618C7C]" />
        {badge}
      </span>
      <h2 className="mt-5 text-2xl font-bold text-white sm:text-3xl md:text-4xl">{title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-white/50 sm:text-base">{subtitle}</p>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#618C7C]/20 to-transparent" />
      <div className="mx-3 h-1.5 w-1.5 rounded-full bg-[#618C7C]/25" />
      <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#618C7C]/20 to-transparent" />
    </div>
  );
}

export function Apresentacao() {
  const { isAuthenticated } = useAuth();
  const activeSection = useActiveSection();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#010A26]">
      {/* ── Navbar ── */}
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
            <Link to="/login" className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-white/80 transition-all hover:border-[#618C7C]/40 hover:text-white">
              Entrar
            </Link>
            <Link to="/cadastro" className="hidden rounded-lg bg-[#618C7C] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#7AAA9A] sm:block">
              Criar conta
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 md:hidden">
              <svg className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="animate-fade-in border-t border-white/8 bg-[#010A26] md:hidden">
            <div className="flex flex-col gap-1 px-5 py-4">
              {NAV_ITEMS.map(({ id, label }) => (
                <button key={id} onClick={() => scrollTo(id)} className={`rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all ${activeSection === id ? 'bg-[#618C7C]/15 text-[#618C7C]' : 'text-white/60 hover:bg-white/5 hover:text-white/90'}`}>
                  {label}
                </button>
              ))}
              <Link to="/cadastro" className="mt-2 rounded-lg bg-[#618C7C] px-4 py-2.5 text-center text-sm font-medium text-white transition-all hover:bg-[#7AAA9A]">
                Criar conta
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section id="inicio" className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-20">
        <GridPattern className="inset-0" />
        <FloatingShapes />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="animate-fade-up">
            {/* Badge animado */}
            <span className="inline-flex items-center gap-2 rounded-full border border-[#618C7C]/30 bg-[#011140] px-5 py-2 text-xs font-medium text-[#618C7C]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#618C7C] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#618C7C]" />
              </span>
              Plataforma de validação acadêmica
            </span>

            <h1 className="mx-auto mt-8 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Centralize e valide os{' '}
              <span className="relative text-[#618C7C]">
                certificados acadêmicos
                <svg className="absolute -bottom-2 left-0 hidden w-full sm:block" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 8C50 2 100 2 150 6C200 10 250 4 298 8" stroke="#618C7C" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
                </svg>
              </span>{' '}
              da sua instituição
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/50 sm:text-lg">
              O ValidaAI conecta estudantes e coordenadores em um único lugar: envie certificados
              de cursos, eventos e atividades complementares, e tenha cada documento
              validado com segurança e rastreabilidade.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/cadastro"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#618C7C] px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-[#7AAA9A] hover:shadow-[0_0_32px_rgba(97,140,124,0.35)] sm:w-auto"
              >
                Começar agora
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link to="/login" className="w-full rounded-xl border border-white/10 px-8 py-3.5 text-base font-medium text-white/80 transition-all hover:border-[#618C7C]/40 hover:text-white sm:w-auto">
                Já tenho uma conta
              </Link>
            </div>
          </div>

          {/* Stats com ícones */}
          <div className="animate-fade-up delay-300 mt-16 grid grid-cols-3 gap-3 sm:gap-6">
            {[
              { value: '100%', label: 'Digital', icon: 'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25' },
              { value: 'QR Code', label: 'Verificável', icon: 'M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z' },
              { value: '24/7', label: 'Disponível', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map((stat) => (
              <div key={stat.label} className="group rounded-xl border border-white/8 bg-[#011140]/50 px-3 py-4 transition-all hover:border-[#618C7C]/20 sm:px-6 sm:py-5">
                <Icon d={stat.icon} className="mx-auto mb-2 h-5 w-5 text-[#618C7C]/60 transition-colors group-hover:text-[#618C7C] sm:h-6 sm:w-6" />
                <div className="text-lg font-bold text-[#618C7C] sm:text-2xl">{stat.value}</div>
                <div className="mt-0.5 text-xs text-white/40 sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <button onClick={() => scrollTo('funcionalidades')} className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/30 transition-colors hover:text-white/60">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </section>

      <Divider />

      {/* ── Como Funciona ── */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <SectionHeading badge="Como Funciona" title="Simples em 4 passos" subtitle="Do cadastro à verificação pública, o processo é rápido e intuitivo." />

          <div className="relative mt-14">
            {/* Linha conectora vertical (mobile) / horizontal (desktop) */}
            <div className="absolute top-0 bottom-0 left-6 w-px bg-gradient-to-b from-[#618C7C]/30 via-[#618C7C]/15 to-transparent sm:left-0 sm:right-0 sm:top-7 sm:bottom-auto sm:h-px sm:w-full sm:bg-gradient-to-r" />

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              {etapas.map((etapa, i) => (
                <div key={etapa.numero} className="animate-fade-up relative flex gap-4 sm:flex-col sm:items-center sm:gap-3 sm:text-center" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#618C7C]/30 bg-[#011140] text-sm font-bold text-[#618C7C]">
                    {etapa.numero}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{etapa.titulo}</h3>
                    <p className="mt-1 text-sm text-white/45">{etapa.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Funcionalidades ── */}
      <section id="funcionalidades" className="relative overflow-hidden px-4 py-20 sm:py-28">
        <GridPattern className="inset-0" />
        <div className="relative mx-auto max-w-6xl">
          <SectionHeading badge="Funcionalidades" title="Tudo que você precisa em um só lugar" subtitle="Uma plataforma completa para gestão de certificados e atividades complementares." />

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {funcionalidades.map((item, i) => (
              <div
                key={item.titulo}
                className="animate-fade-up group relative rounded-2xl border border-white/8 bg-[#011140]/60 p-6 transition-all hover:border-[#618C7C]/25 hover:bg-[#011140]"
                style={{ animationDelay: `${i * 75}ms` }}
              >
                {/* Número decorativo */}
                <span className="absolute top-4 right-5 text-4xl font-black text-white/[0.03]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#618C7C]/25 bg-[#618C7C]/10 transition-colors group-hover:bg-[#618C7C]/20">
                  <Icon d={item.icone} className="h-5 w-5 text-[#618C7C]" />
                </div>
                <h3 className="text-base font-semibold text-white">{item.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">{item.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Benefícios ── */}
      <section id="beneficios" className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading badge="Benefícios" title="Vantagens para cada perfil" subtitle="O ValidaAI foi projetado pensando em cada tipo de usuário da instituição." />

          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            {beneficios.map((grupo, i) => (
              <div
                key={grupo.titulo}
                className="animate-fade-up relative overflow-hidden rounded-2xl border border-white/8 bg-[#011140]/60 p-6 sm:p-7"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Top accent bar */}
                <div className="absolute top-0 right-0 left-0 h-1" style={{ backgroundColor: `${grupo.cor}30` }} />

                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border bg-opacity-10" style={{ borderColor: `${grupo.cor}40`, backgroundColor: `${grupo.cor}15` }}>
                    <Icon d={grupo.icone} className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{grupo.titulo}</h3>
                </div>
                <ul className="space-y-3">
                  {grupo.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-white/50">
                      <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke={grupo.cor} strokeWidth={2}>
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

      <Divider />

      {/* ── Segurança ── */}
      <section id="seguranca" className="relative overflow-hidden px-4 py-20 sm:py-28">
        {/* Shield background decorativo */}
        <svg className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 text-[#618C7C]/[0.02] sm:h-[700px] sm:w-[700px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>

        <div className="relative mx-auto max-w-6xl">
          <SectionHeading badge="Segurança" title="Seus dados estão protegidos" subtitle="Utilizamos as melhores práticas de segurança para proteger seus documentos e informações." />

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {segurancaItems.map((item, i) => (
              <div
                key={item.titulo}
                className="animate-fade-up group rounded-2xl border border-white/8 bg-[#011140]/60 p-6 transition-all hover:border-[#618C7C]/25 hover:bg-[#011140]"
                style={{ animationDelay: `${i * 75}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#618C7C]/25 bg-[#618C7C]/10 transition-colors group-hover:bg-[#618C7C]/20">
                  <Icon d={item.icone} className="h-5 w-5 text-[#618C7C]" />
                </div>
                <h3 className="text-base font-semibold text-white">{item.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">{item.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Contato ── */}
      <section id="contato" className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading badge="Contato" title="Entre em contato" subtitle="Este projeto é desenvolvido como Trabalho de Conclusão de Curso (TCC)." />

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
              <button key={id} onClick={() => scrollTo(id)} className="text-xs text-white/40 transition-colors hover:text-white/70">
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-white/30">&copy; {new Date().getFullYear()} ValidaAI</p>
        </div>
      </footer>
    </div>
  );
}
