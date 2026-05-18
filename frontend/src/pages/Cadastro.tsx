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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setErro('Informe seu nome completo'); return; }
    if (!email.trim()) { setErro('Informe seu e-mail institucional'); return; }
    if (!matricula.trim()) { setErro('Informe sua matrícula'); return; }
    if (!cursoId) { setErro('Selecione seu curso'); return; }

    setErro('');
    setLoading(true);
    try {
      const { token, usuario } = await authService.cadastrar({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
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

  const inputCls = (hasError: boolean) =>
    `rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
    }`;

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
          <h1 className="text-3xl font-bold text-gray-900">
            Valida<span className="text-blue-600">AI</span>
          </h1>
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
                className={inputCls(false)}
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
                className={inputCls(false)}
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
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 hover:border-gray-400"
                >
                  <option value="">Selecione seu curso...</option>
                  {Object.entries(cursosPorInstituicao).map(([inst, lista]) => (
                    <optgroup key={inst} label={inst}>
                      {lista.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
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
                placeholder="Seu número de matrícula"
                autoComplete="off"
                className={inputCls(false)}
              />
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
              {loading ? (
                <>
                  <Spinner />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
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
