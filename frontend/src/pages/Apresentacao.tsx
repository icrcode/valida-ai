import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const recursos = [
  {
    titulo: 'Envie seus certificados',
    descricao:
      'Anexe certificados de cursos, eventos, estágios e atividades complementares em poucos cliques, direto pelo computador ou celular.',
    icone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h4m-7 5h10a2 2 0 002-2V7.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0012.586 2H6a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    ),
  },
  {
    titulo: 'Validação por coordenadores',
    descricao:
      'Coordenadores de cada curso analisam, aprovam ou solicitam ajustes nos documentos enviados pelos estudantes.',
    icone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75l1.5 1.5 3-3.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    titulo: 'Verificação pública',
    descricao:
      'Cada certificado validado recebe um link único, que pode ser compartilhado para comprovar sua autenticidade a qualquer momento.',
    icone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    ),
  },
  {
    titulo: 'Várias instituições, um só lugar',
    descricao:
      'Suporte a múltiplas instituições de ensino, com cursos e usuários organizados de forma independente e segura.',
    icone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15"
      />
    ),
  },
];

export function Apresentacao() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[#010A26]">
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8">
        {/* Topo */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#618C7C]/30 bg-[#011140] shadow-lg shadow-black/30">
              <svg className="h-5 w-5 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">
              Valida<span className="text-[#618C7C]">AI</span>
            </span>
          </div>

          <Link
            to="/login"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:border-[#618C7C]/40 hover:text-white"
          >
            Entrar
          </Link>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="animate-fade-up">
            <span className="inline-block rounded-full border border-[#618C7C]/30 bg-[#011140] px-4 py-1.5 text-xs font-medium text-[#618C7C]">
              Captação e validação de documentos universitários
            </span>

            <h1 className="mx-auto mt-6 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
              Centralize e valide os <span className="text-[#618C7C]">certificados acadêmicos</span> da sua instituição
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm text-white/50 sm:text-base">
              O ValidaAI conecta estudantes e coordenadores em um único lugar: estudantes enviam
              certificados de cursos, eventos e atividades complementares, e coordenadores
              validam cada documento com segurança e rastreabilidade.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/cadastro"
                className="w-full rounded-lg bg-[#618C7C] px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#7AAA9A] hover:shadow-[0_0_24px_rgba(97,140,124,0.3)] focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:ring-offset-2 focus:ring-offset-[#010A26] sm:w-auto"
              >
                Criar conta de estudante
              </Link>
              <Link
                to="/login"
                className="w-full rounded-lg border border-white/10 px-6 py-2.5 text-sm font-medium text-white/80 transition-all hover:border-[#618C7C]/40 hover:text-white sm:w-auto"
              >
                Já tenho uma conta
              </Link>
            </div>
          </div>

          {/* Recursos */}
          <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {recursos.map((recurso) => (
              <div
                key={recurso.titulo}
                className="animate-fade-up rounded-2xl border border-white/8 bg-[#011140] p-6 text-left shadow-2xl shadow-black/40"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#618C7C]/30 bg-[#011640]">
                  <svg className="h-5 w-5 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {recurso.icone}
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">{recurso.titulo}</h3>
                <p className="mt-1.5 text-sm text-white/50">{recurso.descricao}</p>
              </div>
            ))}
          </div>
        </main>

        <footer className="pb-4 text-center text-xs text-white/30">
          Validação inteligente de documentos acadêmicos
        </footer>
      </div>
    </div>
  );
}
