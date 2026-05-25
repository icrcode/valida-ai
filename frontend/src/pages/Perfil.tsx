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
  `w-full rounded-lg border bg-[#011640] px-3 py-2 text-sm text-white placeholder:text-white/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:border-[#618C7C]/50 ${
    erro ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'
  }`;

function InfoRow({ label, valor, placeholder }: Readonly<{ label: string; valor?: string | null; placeholder?: string }>) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-white/35">{label}</span>
      <span className={`text-sm ${valor ? 'text-white' : 'text-white/30 italic'}`}>
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

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [errosDados, setErrosDados] = useState<Record<string, string>>({});

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
      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha(''); setErroSenha('');
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

  return (
    <div className="mx-auto max-w-lg space-y-4 animate-fade-up">
      <div>
        <h2 className="text-xl font-semibold text-white">Meu Perfil</h2>
        <p className="mt-0.5 text-sm text-white/40">Visualize e gerencie suas informações pessoais</p>
      </div>

      {/* Card identidade */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#618C7C] text-xl font-bold text-white ring-4 ring-[#618C7C]/20">
            {perfil?.nome ? iniciais(perfil.nome) : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-white">{perfil?.nome ?? '—'}</p>
            <p className="truncate text-sm text-white/50">{perfil?.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PERFIL_COR[perfil?.perfil ?? ''] ?? 'bg-white/10 text-white/60'}`}>
                {PERFIL_LABEL[perfil?.perfil ?? ''] ?? perfil?.perfil}
              </span>
              {perfil?.instituicao_nome && (
                <span className="text-xs text-white/40">{perfil.instituicao_nome}</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── MODO VER ── */}
      {modo === 'ver' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-white">Dados pessoais</h3>
          </div>
          <div className="divide-y divide-white/6">
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
                <p className="mt-0.5 text-xs text-white/30">Gerenciado pelo administrador</p>
              </div>
            )}
          </div>
          <div className="mt-5 flex gap-3 border-t border-white/8 pt-4">
            <Button onClick={() => { preencherForm(); setModo('editar-dados'); }} className="flex items-center gap-1.5">
              <IconEditar /> Editar perfil
            </Button>
            <Button variant="secondary" onClick={() => setModo('editar-senha')} className="flex items-center gap-1.5">
              <IconCadeado /> Alterar senha
            </Button>
          </div>
        </Card>
      )}

      {/* ── MODO EDITAR DADOS ── */}
      {modo === 'editar-dados' && (
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-medium text-white">Editar dados pessoais</h3>
            <button onClick={cancelar} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition-all">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white/65">Nome completo</label>
              <input type="text" value={nome} placeholder="Seu nome completo"
                onChange={(e) => { setNome(e.target.value); setErrosDados((p) => ({ ...p, nome: '' })); }}
                className={inputCls(!!errosDados.nome)} />
              {errosDados.nome && <p className="text-xs text-red-400">{errosDados.nome}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white/65">E-mail</label>
              <input type="email" value={email} placeholder="seu@email.com"
                onChange={(e) => { setEmail(e.target.value); setErrosDados((p) => ({ ...p, email: '' })); }}
                className={inputCls(!!errosDados.email)} />
              {errosDados.email && <p className="text-xs text-red-400">{errosDados.email}</p>}
            </div>

            {eEstudante && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/65">Matrícula <span className="text-white/30">(opcional)</span></label>
                <input type="text" value={matricula} placeholder="Número de matrícula"
                  onChange={(e) => setMatricula(e.target.value)} className={inputCls(false)} />
              </div>
            )}

            {temCpfEndereco && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-white/65">CPF <span className="text-white/30">(opcional)</span></label>
                  <input type="text" value={cpf} placeholder="000.000.000-00" maxLength={14}
                    onChange={(e) => setCpf(formatarCpf(e.target.value))} className={inputCls(false)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-white/65">Endereço <span className="text-white/30">(opcional)</span></label>
                  <input type="text" value={endereco} placeholder="Rua, número, bairro, cidade — UF"
                    onChange={(e) => setEndereco(e.target.value)} className={inputCls(false)} />
                </div>
              </>
            )}

            {perfil?.instituicao_nome && (
              <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-sm text-white/50">
                Instituição: <span className="font-medium text-white/70">{perfil.instituicao_nome}</span>
                <span className="ml-2 text-xs text-white/30">(gerenciado pelo administrador)</span>
              </div>
            )}

            <div className="flex gap-3 border-t border-white/8 pt-4">
              <Button loading={mutDados.isPending} onClick={handleSalvarDados}>Salvar alterações</Button>
              <Button variant="secondary" onClick={cancelar}>Cancelar</Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── MODO EDITAR SENHA ── */}
      {modo === 'editar-senha' && (
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-medium text-white">Alterar senha</h3>
            <button onClick={cancelar} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition-all">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white/65">Senha atual</label>
              <div className="relative">
                <input type={mostrarSenha ? 'text' : 'password'} value={senhaAtual} placeholder="Sua senha atual"
                  autoComplete="current-password"
                  onChange={(e) => { setSenhaAtual(e.target.value); setErroSenha(''); }}
                  className={`pr-10 ${inputCls(!!erroSenha && !senhaAtual)}`} />
                <button type="button" tabIndex={-1} onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-white/30 hover:text-white/70 transition-colors">
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
              <label className="text-sm font-medium text-white/65">Nova senha</label>
              <input type={mostrarSenha ? 'text' : 'password'} value={novaSenha} placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                onChange={(e) => { setNovaSenha(e.target.value); setErroSenha(''); }}
                className={inputCls(false)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white/65">Confirmar nova senha</label>
              <input type={mostrarSenha ? 'text' : 'password'} value={confirmarSenha} placeholder="Repita a nova senha"
                autoComplete="new-password"
                onChange={(e) => { setConfirmarSenha(e.target.value); setErroSenha(''); }}
                className={inputCls(!!confirmarSenha && novaSenha !== confirmarSenha)} />
              {confirmarSenha && novaSenha !== confirmarSenha && (
                <p className="text-xs text-red-400">As senhas não conferem</p>
              )}
            </div>

            {erroSenha && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-400">{erroSenha}</p>
              </div>
            )}

            <div className="flex gap-3 border-t border-white/8 pt-4">
              <Button loading={mutSenha.isPending} onClick={handleAlterarSenha}>Salvar nova senha</Button>
              <Button variant="secondary" onClick={cancelar}>Cancelar</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
