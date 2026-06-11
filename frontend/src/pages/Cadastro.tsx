import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authService } from '../services/auth';
import { cursosService, type Curso } from '../services/cursos';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import { mensagemErroSegura } from '../utils/seguranca';

const TURNO_ORDEM = ['matutino', 'vespertino', 'noturno', 'integral'] as const;

const TURNO_LABELS: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
  noturno: 'Noturno',
  integral: 'Integral',
};

const MODALIDADE_LABELS: Record<string, string> = {
  presencial: 'Presencial',
  ead: 'EAD',
  hibrido: 'Híbrido',
};

interface Universidade {
  id: string;
  nome: string;
  sigla: string;
  dominios_email: string[];
}

interface GrupoCurso {
  chave: string;
  nome: string;
  modalidade: string | null;
  cursos: Curso[];
}

function rotuloGrupo(grupo: GrupoCurso, ambiguo: boolean): string {
  if (!ambiguo) return grupo.nome;
  const detalhes: string[] = [];
  if (grupo.modalidade) detalhes.push(MODALIDADE_LABELS[grupo.modalidade] ?? grupo.modalidade);
  detalhes.push(`cód. ${grupo.cursos[0].codigo}`);
  return `${grupo.nome} — ${detalhes.join(' · ')}`;
}

export function Cadastro() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [universidadeId, setUniversidadeId] = useState('');
  const [grupoCursoChave, setGrupoCursoChave] = useState('');
  const [turno, setTurno] = useState('');
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: cursos = [], isLoading: loadingCursos } = useQuery<Curso[]>({
    queryKey: ['cursos'],
    queryFn: cursosService.listar,
    staleTime: 60_000,
  });

  // Etapa 1: universidades disponíveis (derivadas dos cursos ativos)
  const universidades = useMemo<Universidade[]>(() => {
    const mapa = new Map<string, Universidade>();
    for (const c of cursos) {
      if (!mapa.has(c.instituicao_id)) {
        mapa.set(c.instituicao_id, {
          id: c.instituicao_id,
          nome: c.instituicao_nome,
          sigla: c.instituicao_sigla,
          dominios_email: c.dominios_email ?? [],
        });
      }
    }
    return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [cursos]);

  // Etapa 2: cursos da universidade selecionada, agrupados por nome + modalidade
  const gruposCurso = useMemo<GrupoCurso[]>(() => {
    if (!universidadeId) return [];
    const mapa = new Map<string, GrupoCurso>();
    for (const c of cursos) {
      if (c.instituicao_id !== universidadeId) continue;
      const chave = `${c.nome}__${c.modalidade ?? ''}`;
      let grupo = mapa.get(chave);
      if (!grupo) {
        grupo = { chave, nome: c.nome, modalidade: c.modalidade, cursos: [] };
        mapa.set(chave, grupo);
      }
      grupo.cursos.push(c);
    }
    return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [cursos, universidadeId]);

  // Cursos com o mesmo nome precisam de informações extras para diferenciá-los
  const nomesAmbiguos = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const g of gruposCurso) contagem.set(g.nome, (contagem.get(g.nome) ?? 0) + 1);
    return contagem;
  }, [gruposCurso]);

  const grupoSelecionado = gruposCurso.find((g) => g.chave === grupoCursoChave) ?? null;

  // Etapa 3: turnos disponíveis para o curso selecionado
  const turnosDisponiveis = useMemo(() => {
    if (!grupoSelecionado) return [];
    return TURNO_ORDEM.filter((t) => grupoSelecionado.cursos.some((c) => c.turno === t));
  }, [grupoSelecionado]);

  const cursoSelecionado = useMemo(() => {
    if (!grupoSelecionado) return null;
    if (turnosDisponiveis.length === 0) return grupoSelecionado.cursos[0] ?? null;
    return grupoSelecionado.cursos.find((c) => c.turno === turno) ?? null;
  }, [grupoSelecionado, turnosDisponiveis, turno]);

  const cursoId = cursoSelecionado?.id ?? '';

  // Etapa 4: domínios de e-mail aceitos pela universidade selecionada
  const universidadeSelecionada = universidades.find((u) => u.id === universidadeId) ?? null;
  const dominiosAceitos = universidadeSelecionada?.dominios_email ?? [];

  // Reseta o curso e o turno ao trocar de universidade
  useEffect(() => {
    setGrupoCursoChave('');
    setTurno('');
  }, [universidadeId]);

  // Reseta o turno ao trocar de curso
  useEffect(() => {
    setTurno('');
  }, [grupoCursoChave]);

  // Auto-seleciona o turno quando há apenas uma opção disponível
  const turnosKey = turnosDisponiveis.join('|');
  useEffect(() => {
    if (turnosDisponiveis.length === 1) setTurno(turnosDisponiveis[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnosKey]);

  function validar(): string | null {
    if (!nome.trim() || nome.trim().length < 2) return 'Informe seu nome completo (mínimo 2 caracteres)';
    if (!universidadeId) return 'Selecione sua universidade';
    if (!grupoCursoChave) return 'Selecione seu curso';
    if (turnosDisponiveis.length > 0 && !turno) return 'Selecione o turno do seu curso';
    if (!cursoId) return 'Selecione seu curso';

    if (!email.trim() || !email.includes('@')) return 'Informe um e-mail válido';
    if (dominiosAceitos.length > 0) {
      const dominio = email.trim().toLowerCase().split('@')[1] ?? '';
      if (!dominiosAceitos.includes(dominio)) {
        return `E-mail fora do domínio institucional. Use um e-mail ${dominiosAceitos.map((d) => `@${d}`).join(' ou ')}`;
      }
    }

    if (!senha || senha.length < 6) return 'A senha deve ter no mínimo 6 caracteres';
    if (senha !== confirmarSenha) return 'As senhas não conferem';
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
      setErro(mensagemErroSegura(err, 'Falha ao criar conta. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-white/10 bg-[#011640] px-3 py-2.5 text-sm text-white placeholder:text-white/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:border-[#618C7C]/50 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10';

  function limparErro() {
    if (erro) setErro('');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#010A26] px-4 py-8">
      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#618C7C]/30 bg-[#011140] shadow-lg shadow-black/30">
            <svg className="h-8 w-8 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Valida<span className="text-[#618C7C]">AI</span></h1>
          <p className="mt-1 text-sm text-white/45">Validação inteligente de documentos acadêmicos</p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#011140] p-8 shadow-2xl shadow-black/40">
          <h2 className="mb-6 text-center text-base font-semibold text-white/80">Criar conta de estudante</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nome" className="text-sm font-medium text-white/65">Nome completo</label>
              <input id="nome" type="text" value={nome} onChange={(e) => { setNome(e.target.value); limparErro(); }}
                placeholder="Seu nome completo" autoComplete="name" autoFocus className={inputCls} />
            </div>

            <p className="-mb-1 text-xs font-semibold uppercase tracking-wide text-white/30">
              Dados acadêmicos
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="universidade" className="text-sm font-medium text-white/65">Universidade</label>
              {loadingCursos ? (
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#011640] px-3 py-2.5 text-sm text-white/40">
                  <Spinner /> Carregando instituições...
                </div>
              ) : (
                <select id="universidade" value={universidadeId}
                  onChange={(e) => { setUniversidadeId(e.target.value); limparErro(); }}
                  aria-describedby="universidade-ajuda"
                  className={`${inputCls} [&>option]:bg-[#011640]`}>
                  <option value="">Selecione sua universidade...</option>
                  {universidades.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome} ({u.sigla})</option>
                  ))}
                </select>
              )}
              <p id="universidade-ajuda" className="text-xs text-white/35">
                Comece escolhendo a instituição onde você estuda.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="curso" className="text-sm font-medium text-white/65">Curso</label>
              <select id="curso" value={grupoCursoChave} disabled={!universidadeId}
                onChange={(e) => { setGrupoCursoChave(e.target.value); limparErro(); }}
                aria-describedby="curso-ajuda"
                className={`${inputCls} [&>option]:bg-[#011640]`}>
                <option value="">
                  {!universidadeId
                    ? 'Selecione a universidade primeiro'
                    : gruposCurso.length === 0
                      ? 'Nenhum curso disponível'
                      : 'Selecione seu curso...'}
                </option>
                {gruposCurso.map((g) => (
                  <option key={g.chave} value={g.chave}>
                    {rotuloGrupo(g, (nomesAmbiguos.get(g.nome) ?? 0) > 1)}
                  </option>
                ))}
              </select>
              <p id="curso-ajuda" className="text-xs text-white/35">
                {universidadeId
                  ? 'Cursos com o mesmo nome são diferenciados pela modalidade e pelo código.'
                  : 'Disponível após escolher a universidade.'}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="turno" className="text-sm font-medium text-white/65">Turno</label>
              <select id="turno" value={turno} disabled={!grupoCursoChave || turnosDisponiveis.length <= 1}
                onChange={(e) => { setTurno(e.target.value); limparErro(); }}
                aria-describedby="turno-ajuda"
                className={`${inputCls} [&>option]:bg-[#011640]`}>
                <option value="">
                  {!grupoCursoChave
                    ? 'Selecione o curso primeiro'
                    : turnosDisponiveis.length === 0
                      ? 'Não informado'
                      : 'Selecione o turno...'}
                </option>
                {turnosDisponiveis.map((t) => (
                  <option key={t} value={t}>{TURNO_LABELS[t]}</option>
                ))}
              </select>
              <p id="turno-ajuda" className="text-xs text-white/35">
                {grupoCursoChave
                  ? turnosDisponiveis.length > 1
                    ? 'Escolha o turno em que você estuda.'
                    : 'Este curso possui apenas um turno disponível.'
                  : 'Disponível após escolher o curso.'}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-white/65">E-mail institucional</label>
              <input id="email" type="email" value={email} disabled={!cursoId}
                onChange={(e) => { setEmail(e.target.value); limparErro(); }}
                placeholder={dominiosAceitos.length > 0 ? `seunome@${dominiosAceitos[0]}` : 'seu@instituicao.edu.br'}
                autoComplete="email" aria-describedby="email-ajuda" className={inputCls} />
              <p id="email-ajuda" className="text-xs text-white/35">
                {!cursoId
                  ? 'Disponível após escolher universidade, curso e turno.'
                  : dominiosAceitos.length > 0
                    ? `Use seu e-mail de estudante: ${dominiosAceitos.map((d) => `@${d}`).join(' ou ')}.`
                    : 'Use o e-mail de estudante fornecido pela sua instituição.'}
              </p>
            </div>

            <p className="-mb-1 text-xs font-semibold uppercase tracking-wide text-white/30">
              Dados de acesso
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="matricula" className="text-sm font-medium text-white/65">Matrícula</label>
              <input id="matricula" type="text" value={matricula} onChange={(e) => { setMatricula(e.target.value); limparErro(); }}
                placeholder="Número de matrícula" autoComplete="off" className={inputCls} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="senha" className="text-sm font-medium text-white/65">Senha</label>
              <div className="relative">
                <input id="senha" type={mostrarSenha ? 'text' : 'password'} value={senha}
                  onChange={(e) => { setSenha(e.target.value); limparErro(); }}
                  placeholder="Mínimo 6 caracteres" autoComplete="new-password"
                  className={`pr-10 ${inputCls}`} />
                <button type="button" onClick={() => setMostrarSenha((v) => !v)} tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-white/30 hover:text-white/70 transition-colors"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {mostrarSenha
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmarSenha" className="text-sm font-medium text-white/65">Confirmar senha</label>
              <input id="confirmarSenha" type={mostrarSenha ? 'text' : 'password'} value={confirmarSenha}
                onChange={(e) => { setConfirmarSenha(e.target.value); limparErro(); }}
                placeholder="Repita a senha" autoComplete="new-password"
                className={`${inputCls} ${senha && confirmarSenha && senha !== confirmarSenha ? 'border-red-500/50' : ''}`} />
              {senha && confirmarSenha && senha !== confirmarSenha && (
                <p className="text-xs text-red-400">As senhas não conferem</p>
              )}
            </div>

            {erro && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5" role="alert">
                <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-red-400">{erro}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[#618C7C] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#7AAA9A] hover:shadow-[0_0_24px_rgba(97,140,124,0.3)] focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:ring-offset-2 focus:ring-offset-[#011140] disabled:opacity-50">
              {loading ? <><Spinner /> Criando conta...</> : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-white/40">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-medium text-[#618C7C] hover:text-[#7AAA9A] transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
