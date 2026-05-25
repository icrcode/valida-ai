import { Link } from 'react-router-dom';

export function NaoEncontrado() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 animate-fade-up">
      <p className="text-7xl font-bold text-[#618C7C]">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-white">Página não encontrada</h1>
      <p className="mt-2 text-sm text-white/45">A página que você está procurando não existe.</p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#618C7C] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#7AAA9A] hover:shadow-[0_0_20px_rgba(97,140,124,0.25)]"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
