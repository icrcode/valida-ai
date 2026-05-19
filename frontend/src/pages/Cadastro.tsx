import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authService } from '../services/auth';
import { cursosService, type Curso } from '../services/cursos';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

export function Cadastro() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [matricula, setMatricula] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: cursos = [], isLoading: loadingCursos } = useQuery<Curso[]>({
    queryKey: ['cursos'],
    queryFn: cursosService.listar,
    staleTime: 60_000,
  });

  const cursosPorInstituicao = groupBy(cursos, (c) => c.instituicao_nome);

  function validar(): string | null {
    if (!nome.trim() || nome.trim().length < 2) return 'Informe seu nome completo (mínimo 2 caracteres)';
    if (!email.trim() || !email.includes('@')) return 'Informe um e-mail válido';
    if (!senha || senha.length < 6) return 'A senha deve ter no mínimo 6 caracteres';
    if (senha !== confirmarSenha) return 'As senhas não conferem';
    if (!cursoId) return 'Selecione seu curso';
    if (!matricula.trim() || matricula.trim().length < 2) return 'Informe sua matrícula acadêmica';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const erroValidacao = validar();
    if (erroValidacao) { setErro(erroValidacao); return; }
    setErro('');
    setLoading(true);
    try {
      const { token, usuario } = await authService.cadastrar({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha,
        matricula: matricula.trim(),
        curso_id: cursoId,
      });
      login(token, usuario);
      navigate('/dashboard');
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { mensagem?: string; erro?: string } };
        message?: string;
      };
      const data = apiErr?.response?.data;
      setErro(data?.mensagem ?? data?.erro ?? apiErr?.message ?? 'Falha ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 hover:border-gray-400';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Valida<span className="text-blue-600">AI</span></h1>
          <p className="mt-1 text-sm text-gray-500">Validação inteligente de documentos acadêmicos</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-center text-base font-semibold text-gray-800">Criar conta de estudante</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nome */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nome" className="text-sm font-medium text-gray-700">Nome completo</label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => { setNome(e.target.value); if (erro) setErro(''); }}
                placeholder="Seu nome completo"
                autoComplete="name"
                autoFocus
                className={inputCls}
              />
            </div>

            {/* E-mail */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail institucional</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (erro) setErro(''); }}
                placeholder="seu@instituicao.edu.br"
                autoComplete="email"
                className={inputCls}
              />
            </div>

            {/* Curso */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="curso" className="text-sm font-medium text-gray-700">Curso</label>
              {loadingCursos ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-400">
                  <Spinner /> Carregando cursos...
                </div>
              ) : (
                <select
                  id="curso"
                  value={cursoId}
                  onChange={(e) => { setCursoId(e.target.value); if (erro) setErro(''); }}
                  className={inputCls}
                >
                  <option value="">Selecione seu curso...</option>
                  {Object.entries(cursosPorInstituicao).map(([inst, lista]) => (
                    <optgroup key={inst} label={inst}>
                      {lista.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>

            {/* Matrícula */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="matricula" className="text-sm font-medium text-gray-700">Matrícula</label>
              <input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => { setMatricula(e.target.value); if (erro) setErro(''); }}
                placeholder="Número de matrícula"
                autoComplete="off"
                className={inputCls}
              />
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="senha" className="text-sm font-medium text-gray-700">Senha</label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); if (erro) setErro(''); }}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className={`w-full pr-10 ${inputCls}`}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
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

            {/* Confirmar Senha */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmarSenha" className="text-sm font-medium text-gray-700">Confirmar senha</label>
              <input
                id="confirmarSenha"
                type={mostrarSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => { setConfirmarSenha(e.target.value); if (erro) setErro(''); }}
                placeholder="Repita a senha"
                autoComplete="new-password"
                className={inputCls}
              />
              {senha && confirmarSenha && senha !== confirmarSenha && (
                <p className="text-xs text-red-500">As senhas não conferem</p>
              )}
            </div>

            {erro && (
              <p className="flex items-start gap-1.5 text-xs text-red-600">
                <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {loading ? <><Spinner /> Criando conta...</> : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
