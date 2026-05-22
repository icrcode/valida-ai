import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usuariosService } from '../services/usuarios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PERFIL_LABEL, PERFIL_COR, iniciais } from '../utils/perfil';

type Modo = 'ver' | 'editar-dados' | 'editar-senha';

const inputCls = (erro: boolean) =>
  `rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${
    erro ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
  }`;

function InfoRow({ label, valor, placeholder }: { label: string; valor?: string | null; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <span className={`text-sm ${valor ? 'text-gray-900' : 'text-gray-400 italic'}`}>
        {valor || placeholder || '—'}
      </span>
    </div>
  );
}

function formatarCpf(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function Perfil() {
  const { usuario, login } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('token') ?? '';

  const [modo, setModo] = useState<Modo>('ver');

  // ─── Form dados pessoais ──────────────────────────────────────
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [errosDados, setErrosDados] = useState<Record<string, string>>({});

  // ─── Form senha ───────────────────────────────────────────────
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');

  const { data: dados } = useQuery({
    queryKey: ['perfil'],
    queryFn: usuariosService.getPerfil,
    staleTime: 30_000,
  });

  const perfil = dados ?? usuario;
  const eEstudante = perfil?.perfil === 'estudante';
  const temCpfEndereco = perfil?.perfil === 'estudante' || perfil?.perfil === 'coordenador';

  function preencherForm() {
    setNome(perfil?.nome ?? '');
    setEmail(perfil?.email ?? '');
    setMatricula(perfil?.matricula ?? '');
    setCpf(perfil?.cpf ?? '');
    setEndereco(perfil?.endereco ?? '');
    setErrosDados({});
  }

  useEffect(() => {
    if (perfil) preencherForm();
  }, [perfil?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutDados = useMutation({
    mutationFn: () =>
      usuariosService.atualizarPerfil({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        matricula: eEstudante ? (matricula.trim() || null) : undefined,
        cpf: temCpfEndereco ? (cpf.trim() || null) : undefined,
        endereco: temCpfEndereco ? (endereco.trim() || null) : undefined,
      }),
    onSuccess: (atualizado) => {
      login(token, atualizado);
      queryClient.setQueryData(['perfil'], atualizado);
      addToast('Dados atualizados com sucesso!', 'success');
      setModo('ver');
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { data?: { erro?: string } } };
      addToast(apiErr?.response?.data?.erro ?? 'Erro ao atualizar dados', 'error');
    },
  });

  const mutSenha = useMutation({
    mutationFn: () =>
      usuariosService.atualizarPerfil({ senha_atual: senhaAtual, nova_senha: novaSenha }),
    onSuccess: () => {
      addToast('Senha alterada com sucesso!', 'success');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setErroSenha('');
      setMostrarSenha(false);
      setModo('ver');
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { data?: { erro?: string } } };
      setErroSenha(apiErr?.response?.data?.erro ?? 'Erro ao alterar senha');
    },
  });

  function handleSalvarDados() {
    const erros: Record<string, string> = {};
    if (!nome.trim() || nome.trim().length < 2) erros.nome = 'Nome deve ter no mínimo 2 caracteres';
    if (!email.trim() || !email.includes('@')) erros.email = 'E-mail inválido';
    if (Object.keys(erros).length > 0) { setErrosDados(erros); return; }
    mutDados.mutate();
  }

  function handleAlterarSenha() {
    if (!senhaAtual) { setErroSenha('Informe a senha atual'); return; }
    if (!novaSenha || novaSenha.length < 6) { setErroSenha('Nova senha deve ter no mínimo 6 caracteres'); return; }
    if (novaSenha !== confirmarSenha) { setErroSenha('As senhas não conferem'); return; }
    setErroSenha('');
    mutSenha.mutate();
  }

  function cancelar() {
    preencherForm();
    setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha(''); setErroSenha('');
    setModo('ver');
  }

  // ─── Ícones ───────────────────────────────────────────────────
  const IconEditar = () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
    </svg>
  );
  const IconCadeado = () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
  const IconOlho = ({ aberto }: { aberto: boolean }) => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {aberto ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </>
      )}
    </svg>
  );

  return (
    <div className="mx-auto max-w-lg space-y-4">

      {/* ── Cabeçalho da página ── */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Meu Perfil</h2>
        <p className="mt-0.5 text-sm text-gray-500">Visualize e gerencie suas informações pessoais</p>
      </div>

      {/* ── Card de identidade ── */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white shadow-sm">
            {perfil?.nome ? iniciais(perfil.nome) : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-gray-900">{perfil?.nome ?? '—'}</p>
            <p className="truncate text-sm text-gray-500">{perfil?.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PERFIL_COR[perfil?.perfil ?? ''] ?? 'bg-gray-100 text-gray-700'}`}>
                {PERFIL_LABEL[perfil?.perfil ?? ''] ?? perfil?.perfil}
              </span>
              {perfil?.instituicao_nome && (
                <span className="text-xs text-gray-400">{perfil.instituicao_nome}</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ════════════════════════════════════════════
          MODO VER
      ════════════════════════════════════════════ */}
      {modo === 'ver' && (
        <>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Dados pessoais</h3>
            </div>

            <div className="divide-y divide-gray-100">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-3">
                <InfoRow label="Nome completo" valor={perfil?.nome} />
                <InfoRow label="E-mail" valor={perfil?.email} />
              </div>

              {eEstudante && (
                <div className="py-3">
                  <InfoRow label="Matrícula" valor={perfil?.matricula} placeholder="Não informada" />
                </div>
              )}

              {temCpfEndereco && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-3">
                  <InfoRow label="CPF" valor={perfil?.cpf} placeholder="Não informado" />
                  <InfoRow label="Endereço" valor={perfil?.endereco} placeholder="Não informado" />
                </div>
              )}

              {perfil?.instituicao_nome && (
                <div className="py-3">
                  <InfoRow label="Instituição" valor={perfil.instituicao_nome} />
                  <p className="mt-0.5 text-xs text-gray-400">Gerenciado pelo administrador</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3 border-t border-gray-100 pt-4">
              <Button
                onClick={() => { preencherForm(); setModo('editar-dados'); }}
                className="flex items-center gap-1.5"
              >
                <IconEditar />
                Editar perfil
              </Button>
              <Button
                variant="secondary"
                onClick={() => setModo('editar-senha')}
                className="flex items-center gap-1.5"
              >
                <IconCadeado />
                Alterar senha
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          MODO EDITAR DADOS
      ════════════════════════════════════════════ */}
      {modo === 'editar-dados' && (
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Editar dados pessoais</h3>
            <button
              onClick={cancelar}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nome completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => { setNome(e.target.value); setErrosDados((p) => ({ ...p, nome: '' })); }}
                placeholder="Seu nome completo"
                className={inputCls(!!errosDados.nome)}
              />
              {errosDados.nome && <p className="text-xs text-red-500">{errosDados.nome}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrosDados((p) => ({ ...p, email: '' })); }}
                placeholder="seu@email.com"
                className={inputCls(!!errosDados.email)}
              />
              {errosDados.email && <p className="text-xs text-red-500">{errosDados.email}</p>}
            </div>

            {eEstudante && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Matrícula <span className="text-xs text-gray-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Número de matrícula"
                  className={inputCls(false)}
                />
              </div>
            )}

            {temCpfEndereco && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    CPF <span className="text-xs text-gray-400">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatarCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={inputCls(false)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    Endereço <span className="text-xs text-gray-400">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, bairro, cidade — UF"
                    className={inputCls(false)}
                  />
                </div>
              </>
            )}

            {perfil?.instituicao_nome && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                Instituição: <span className="font-medium text-gray-700">{perfil.instituicao_nome}</span>
                <span className="ml-2 text-xs text-gray-400">(gerenciado pelo administrador)</span>
              </div>
            )}

            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <Button loading={mutDados.isPending} onClick={handleSalvarDados}>
                Salvar alterações
              </Button>
              <Button variant="secondary" onClick={cancelar}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          MODO EDITAR SENHA
      ════════════════════════════════════════════ */}
      {modo === 'editar-senha' && (
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Alterar senha</h3>
            <button
              onClick={cancelar}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Senha atual</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senhaAtual}
                  onChange={(e) => { setSenhaAtual(e.target.value); setErroSenha(''); }}
                  placeholder="Sua senha atual"
                  autoComplete="current-password"
                  className={`w-full pr-10 ${inputCls(!!erroSenha && !senhaAtual)}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                >
                  <IconOlho aberto={mostrarSenha} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nova senha</label>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => { setNovaSenha(e.target.value); setErroSenha(''); }}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className={inputCls(false)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Confirmar nova senha</label>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => { setConfirmarSenha(e.target.value); setErroSenha(''); }}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                className={inputCls(!!confirmarSenha && novaSenha !== confirmarSenha)}
              />
              {confirmarSenha && novaSenha !== confirmarSenha && (
                <p className="text-xs text-red-500">As senhas não conferem</p>
              )}
            </div>

            {erroSenha && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-600">{erroSenha}</p>
              </div>
            )}

            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <Button loading={mutSenha.isPending} onClick={handleAlterarSenha}>
                Salvar nova senha
              </Button>
              <Button variant="secondary" onClick={cancelar}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}
