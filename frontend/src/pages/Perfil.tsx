import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usuariosService } from '../services/usuarios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PERFIL_LABEL, PERFIL_COR, iniciais } from '../utils/perfil';

const inputCls = (erro: boolean) =>
  `rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${
    erro ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
  }`;

export function Perfil() {
  const { usuario, login } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('token') ?? '';

  // ─── Dados pessoais ───────────────────────────────────────────
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');
  const [errosDados, setErrosDados] = useState<Record<string, string>>({});

  // ─── Senha ───────────────────────────────────────────────────
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

  // Preenche os campos com os dados atuais
  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome ?? '');
      setEmail(perfil.email ?? '');
      setMatricula(perfil.matricula ?? '');
    }
  }, [perfil?.id]);

  const mutDados = useMutation({
    mutationFn: () =>
      usuariosService.atualizarPerfil({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        matricula: perfil?.perfil === 'estudante' ? (matricula.trim() || null) : undefined,
      }),
    onSuccess: (atualizado) => {
      login(token, atualizado);
      queryClient.setQueryData(['perfil'], atualizado);
      addToast('Dados atualizados com sucesso!', 'success');
      setErrosDados({});
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
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { data?: { erro?: string } } };
      const msg = apiErr?.response?.data?.erro ?? 'Erro ao alterar senha';
      setErroSenha(msg);
    },
  });

  function handleSalvarDados() {
    const erros: Record<string, string> = {};
    if (!nome.trim() || nome.trim().length < 2) erros.nome = 'Nome deve ter no mínimo 2 caracteres';
    if (!email.trim() || !email.includes('@')) erros.email = 'E-mail inválido';
    if (Object.keys(erros).length > 0) { setErrosDados(erros); return; }
    setErrosDados({});
    mutDados.mutate();
  }

  function handleAlterarSenha() {
    if (!senhaAtual) { setErroSenha('Informe a senha atual'); return; }
    if (!novaSenha || novaSenha.length < 6) { setErroSenha('Nova senha deve ter no mínimo 6 caracteres'); return; }
    if (novaSenha !== confirmarSenha) { setErroSenha('As senhas não conferem'); return; }
    setErroSenha('');
    mutSenha.mutate();
  }

  const eEstudante = perfil?.perfil === 'estudante';

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Meu Perfil</h2>

      {/* ── Avatar + identidade ── */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
            {perfil?.nome ? iniciais(perfil.nome) : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-gray-900">{perfil?.nome}</p>
            <p className="truncate text-sm text-gray-500">{perfil?.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
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

      {/* ── Dados pessoais ── */}
      <Card>
        <h3 className="mb-4 font-medium text-gray-900">Dados pessoais</h3>
        <div className="flex flex-col gap-4">
          {/* Nome */}
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

          {/* E-mail */}
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

          {/* Matrícula — só para estudantes */}
          {eEstudante && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Matrícula</label>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Número de matrícula"
                className={inputCls(false)}
              />
            </div>
          )}

          {/* Campos somente leitura: perfil + instituição */}
          {perfil?.instituicao_nome && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              Instituição: <span className="font-medium text-gray-700">{perfil.instituicao_nome}</span>
              <span className="ml-2 text-xs text-gray-400">(gerenciado pelo administrador)</span>
            </div>
          )}

          <Button loading={mutDados.isPending} onClick={handleSalvarDados}>
            Salvar dados
          </Button>
        </div>
      </Card>

      {/* ── Segurança / Trocar senha ── */}
      <Card>
        <h3 className="mb-4 font-medium text-gray-900">Alterar senha</h3>
        <div className="flex flex-col gap-4">
          {/* Senha atual */}
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
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {mostrarSenha ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Nova senha */}
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

          {/* Confirmar nova senha */}
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
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erroSenha}</p>
          )}

          <Button
            variant="secondary"
            loading={mutSenha.isPending}
            onClick={handleAlterarSenha}
          >
            Alterar senha
          </Button>
        </div>
      </Card>
    </div>
  );
}
