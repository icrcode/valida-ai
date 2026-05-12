import { Link } from 'react-router-dom';

export function NaoEncontrado() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <p className="text-6xl font-bold text-blue-700">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">Página não encontrada</h1>
      <p className="mt-2 text-gray-500">A página que você está procurando não existe.</p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
