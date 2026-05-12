import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErro('Informe seu e-mail');
      return;
    }
    setErro('');
    setLoading(true);
    try {
      const { token, usuario } = await authService.loginDev(email.trim());
      login(token, usuario);
      navigate('/documentos');
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { status?: number; data?: { erro?: string; mensagem?: string; detalhe?: string } };
        message?: string;
      };
      const status = apiErr?.response?.status;
      const data = apiErr?.response?.data;

      console.error('[login] falha na requisição', {
        status,
        erro: data?.erro,
        detalhe: data?.detalhe,
        mensagem: data?.mensagem,
        raw: err,
      });

      const textoErro =
        data?.mensagem ??
        data?.erro ??
        apiErr?.message ??
        'Falha ao conectar com o servidor';

      const detalhe = data?.detalhe;
      setErro(detalhe ? `${textoErro}: ${detalhe}` : textoErro);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
            <svg
              className="h-8 w-8 text-white"
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
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Valida AI</h1>
          <p className="mt-1 text-sm text-gray-500">Sistema de validação de documentos</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-base font-semibold text-gray-800">Acesse sua conta</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                E-mail institucional
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (erro) setErro('');
                }}
                placeholder="seu@email.com"
                autoComplete="email"
                autoFocus
                required
                className={`rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  erro ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              />
              {erro && (
                <p className="text-xs text-red-600">
                  {erro}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          Ambiente de desenvolvimento · acesso por e-mail
        </p>
      </div>
    </div>
  );
}
