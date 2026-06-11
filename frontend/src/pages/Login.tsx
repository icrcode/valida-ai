import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import { mensagemErroSegura } from '../utils/seguranca';

type Etapa = 'email' | 'senha';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [etapa, setEtapa] = useState<Etapa>('email');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  function handleContinuar(e: FormEvent) {
    e.preventDefault();
    const emailNormalizado = email.trim();
    if (!emailNormalizado) { setErro('Informe seu e-mail'); return; }
    if (!emailNormalizado.includes('@')) { setErro('Informe um e-mail válido'); return; }
    setEmail(emailNormalizado);
    setErro('');
    setEtapa('senha');
  }

  function voltarParaEmail() {
    setSenha('');
    setMostrarSenha(false);
    setErro('');
    setEtapa('email');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!senha) { setErro('Informe sua senha'); return; }
    setErro('');
    setLoading(true);
    try {
      const { token, usuario } = await authService.login(email.trim().toLowerCase(), senha);
      login(token, usuario);
      navigate('/dashboard');
    } catch (err: unknown) {
      setErro(mensagemErroSegura(err, 'Falha ao conectar com o servidor'));
    } finally {
      setLoading(false);
    }
  }

  const inputCls = (hasError: boolean) =>
    `w-full rounded-lg border bg-[#011640] px-3 py-2.5 text-sm text-white placeholder:text-white/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:border-[#618C7C]/50 ${
      hasError ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'
    }`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#010A26] px-4">
      <div className="relative w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#618C7C]/30 bg-[#011140] shadow-lg shadow-black/30">
            <svg className="h-8 w-8 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Valida<span className="text-[#618C7C]">AI</span>
          </h1>
          <p className="mt-1 text-sm text-white/45">Validação inteligente de documentos acadêmicos</p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#011140] p-8 shadow-2xl shadow-black/40">
          <h2 className="mb-2 text-center text-base font-semibold text-white/80">Acesse sua conta</h2>

          {/* Indicador de etapas */}
          <div className="mb-6 flex items-center justify-center gap-2" aria-hidden="true">
            <span className={`h-1.5 rounded-full transition-all ${etapa === 'email' ? 'w-6 bg-[#618C7C]' : 'w-1.5 bg-white/15'}`} />
            <span className={`h-1.5 rounded-full transition-all ${etapa === 'senha' ? 'w-6 bg-[#618C7C]' : 'w-1.5 bg-white/15'}`} />
          </div>

          {etapa === 'email' ? (
            <form onSubmit={handleContinuar} className="flex flex-col gap-4 animate-fade-up">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-white/65">E-mail</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (erro) setErro(''); }}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  autoFocus
                  className={inputCls(!!erro)}
                />
              </div>

              {erro && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-red-400">{erro}</p>
                </div>
              )}

              <button
                type="submit"
                className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[#618C7C] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#7AAA9A] hover:shadow-[0_0_24px_rgba(97,140,124,0.3)] focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:ring-offset-2 focus:ring-offset-[#011140]"
              >
                Continuar
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-up">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#011640] px-3 py-2.5">
                <span className="truncate text-sm text-white/80">{email}</span>
                <button
                  type="button"
                  onClick={voltarParaEmail}
                  className="flex-shrink-0 text-xs font-medium text-[#618C7C] transition-colors hover:text-[#7AAA9A]"
                >
                  Trocar
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="senha" className="text-sm font-medium text-white/65">Senha</label>
                <div className="relative">
                  <input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); if (erro) setErro(''); }}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    autoFocus
                    className={`pr-10 ${inputCls(!!erro)}`}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-white/30 hover:text-white/70 transition-colors"
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {erro && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-red-400">{erro}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[#618C7C] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#7AAA9A] hover:shadow-[0_0_24px_rgba(97,140,124,0.3)] focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:ring-offset-2 focus:ring-offset-[#011140] disabled:opacity-50"
              >
                {loading ? <><Spinner /> Entrando...</> : 'Entrar'}
              </button>
            </form>
          )}
        </div>

        {etapa === 'email' && (
          <p className="mt-5 text-center text-sm text-white/40">
            Novo por aqui?{' '}
            <Link to="/cadastro" className="font-medium text-[#618C7C] hover:text-[#7AAA9A] transition-colors">
              Criar conta de estudante
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
