import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usuariosService, type CriarUsuarioInput, type AtualizarUsuarioInput } from '../services/usuarios';
import { cursosService, type Curso } from '../services/cursos';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PERFIL_LABEL, PERFIL_COR, iniciais } from '../utils/perfil';
import type { Perfil, Usuario } from '../types';
import { AddIcon } from '../components/icons';

const PERFIS: Perfil[] = ['estudante', 'coordenador', 'admin'];

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

// ─── Formulário compartilhado (criar + editar) ─────────────────

interface FormCriar {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil;
  matricula: string;
  curso_id: string;
}

interface FormEditar {
  nome: string;
  email: string;
  perfil: Perfil;
  matricula: string;
  cpf: string;
  endereco: string;
  curso_id: string;
}

const CRIAR_VAZIO: FormCriar = { nome: '', email: '', senha: '', perfil: 'estudante', matricula: '', curso_id: '' };
const EDITAR_VAZIO: FormEditar = { nome: '', email: '', perfil: 'estudante', matricula: '', cpf: '', endereco: '', curso_id: '' };

const inputCls = 'rounded-lg border border-white/10 bg-[#011640] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#618C7C] hover:border-white/20 transition-all';

function formatarCpf(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ─── Modal ────────────────────────────────────────────────────
function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center px-4 py-8">
        <div
          className="w-full max-w-md rounded-2xl bg-[#011140] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
            <h2 className="text-base font-semibold text-white">{titulo}</h2>
            <button onClick={onClose} className="rounded-lg p-1.5 text-white/45 hover:bg-white/6 hover:text-white/70">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Campos comuns de formulário ──────────────────────────────
function CamposUsuario({
  form,
  onChange,
  cursos,
  modoEdicao,
}: {
  form: FormCriar | FormEditar;
  onChange: (f: FormCriar | FormEditar) => void;
  cursos: Curso[];
  modoEdicao: boolean;
}) {
  const cursosPorInstituicao = groupBy(cursos, (c) => c.instituicao_nome);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white/70">Nome completo</label>
        <input type="text" value={form.nome} onChange={(e) => onChange({ ...form, nome: e.target.value })}
          placeholder="Nome completo" className={inputCls} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white/70">E-mail</label>
        <input type="email" value={form.email} onChange={(e) => onChange({ ...form, email: e.target.value })}
          placeholder="email@instituicao.edu.br" className={inputCls} />
      </div>

      {!modoEdicao && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-white/70">Senha inicial</label>
          <input type="password" value={(form as FormCriar).senha}
            onChange={(e) => onChange({ ...form, senha: e.target.value } as FormCriar)}
            placeholder="Mínimo 6 caracteres" autoComplete="new-password" className={inputCls} />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white/70">Perfil</label>
        <select value={form.perfil} onChange={(e) => onChange({ ...form, perfil: e.target.value as Perfil })}
          className={inputCls}>
          {PERFIS.map((p) => <option key={p} value={p}>{PERFIL_LABEL[p] ?? p}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white/70">
          Curso <span className="text-xs text-white/35">(opcional)</span>
        </label>
        <select value={form.curso_id} onChange={(e) => onChange({ ...form, curso_id: e.target.value })}
          className={inputCls}>
          <option value="">Sem curso vinculado</option>
          {Object.entries(cursosPorInstituicao).map(([inst, lista]) => (
            <optgroup key={inst} label={inst}>
              {lista.map((c) => (
                <option key={c.id} value={c.id}>[{c.codigo}] {c.nome}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {(form.perfil === 'estudante') && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-white/70">
            Matrícula <span className="text-xs text-white/35">(opcional)</span>
          </label>
          <input type="text" value={form.matricula}
            onChange={(e) => onChange({ ...form, matricula: e.target.value })}
            placeholder="Número de matrícula" className={inputCls} />
        </div>
      )}

      {(form.perfil === 'estudante' || form.perfil === 'coordenador') && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-white/70">
              CPF <span className="text-xs text-white/35">(opcional)</span>
            </label>
            <input
              type="text"
              value={(form as FormEditar).cpf ?? ''}
              onChange={(e) => onChange({ ...form, cpf: formatarCpf(e.target.value) } as FormEditar)}
              placeholder="000.000.000-00"
              maxLength={14}
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-white/70">
              Endereço <span className="text-xs text-white/35">(opcional)</span>
            </label>
            <input
              type="text"
              value={(form as FormEditar).endereco ?? ''}
              onChange={(e) => onChange({ ...form, endereco: e.target.value } as FormEditar)}
              placeholder="Rua, número, bairro, cidade — UF"
              className={inputCls}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────
export function Usuarios() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [modalCriar, setModalCriar] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [formCriar, setFormCriar] = useState<FormCriar>(CRIAR_VAZIO);
  const [formEditar, setFormEditar] = useState<FormEditar>(EDITAR_VAZIO);
  const [busca, setBusca] = useState('');

  const { data: usuarios = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => usuariosService.listar(),
  });

  const { data: cursos = [] } = useQuery<Curso[]>({
    queryKey: ['cursos'],
    queryFn: cursosService.listar,
    staleTime: 60_000,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['usuarios'] });

  const mutCriar = useMutation({
    mutationFn: (dados: CriarUsuarioInput & { senha: string }) =>
      usuariosService.criar({ ...dados }),
    onSuccess: () => {
      addToast('Usuário criado com sucesso!', 'success');
      setModalCriar(false);
      setFormCriar(CRIAR_VAZIO);
      invalidar();
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { data?: { erro?: string } } };
      addToast(apiErr?.response?.data?.erro ?? 'Erro ao criar usuário', 'error');
    },
  });

  const mutAtualizar = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: AtualizarUsuarioInput }) =>
      usuariosService.atualizar(id, dados),
    onSuccess: () => {
      addToast('Usuário atualizado com sucesso!', 'success');
      setUsuarioEditando(null);
      invalidar();
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { data?: { erro?: string } } };
      addToast(apiErr?.response?.data?.erro ?? 'Erro ao atualizar usuário', 'error');
    },
  });

  const mutAlterarAtivo = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      usuariosService.alterarAtivo(id, ativo),
    onSuccess: (_, vars) => {
      addToast(vars.ativo ? 'Usuário ativado!' : 'Usuário desativado!', 'success');
      invalidar();
    },
    onError: () => addToast('Erro ao alterar status', 'error'),
  });

  function abrirCriar() {
    setFormCriar(CRIAR_VAZIO);
    setModalCriar(true);
  }

  function abrirEditar(u: Usuario) {
    setFormEditar({
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      matricula: u.matricula ?? '',
      cpf: u.cpf ?? '',
      endereco: u.endereco ?? '',
      curso_id: u.curso_id ?? '',
    });
    setUsuarioEditando(u);
  }

  function handleCriar() {
    if (!formCriar.nome.trim() || !formCriar.email.trim()) {
      addToast('Nome e e-mail são obrigatórios', 'error');
      return;
    }
    if (!formCriar.senha || formCriar.senha.length < 6) {
      addToast('Senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }
    mutCriar.mutate({
      nome: formCriar.nome.trim(),
      email: formCriar.email.trim().toLowerCase(),
      senha: formCriar.senha,
      perfil: formCriar.perfil,
      matricula: formCriar.matricula.trim() || undefined,
      curso_id: formCriar.curso_id || undefined,
    } as CriarUsuarioInput & { senha: string });
  }

  function handleAtualizar() {
    if (!usuarioEditando) return;
    if (!formEditar.nome.trim()) { addToast('Nome é obrigatório', 'error'); return; }
    if (!formEditar.email.trim() || !formEditar.email.includes('@')) {
      addToast('E-mail inválido', 'error');
      return;
    }
    const temCpfEndereco = formEditar.perfil === 'estudante' || formEditar.perfil === 'coordenador';
    mutAtualizar.mutate({
      id: usuarioEditando.id,
      dados: {
        nome: formEditar.nome.trim(),
        email: formEditar.email.trim().toLowerCase(),
        perfil: formEditar.perfil,
        matricula: formEditar.matricula.trim() || null,
        cpf: temCpfEndereco ? (formEditar.cpf.trim() || null) : null,
        endereco: temCpfEndereco ? (formEditar.endereco.trim() || null) : null,
        curso_id: formEditar.curso_id || null,
      },
    });
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      u.nome.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.matricula ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Usuários</h2>
          <p className="mt-0.5 text-sm text-white/45">Gerencie os usuários da plataforma</p>
        </div>
        <Button onClick={abrirCriar} className="flex items-center gap-1.5">
          <AddIcon className="h-4 w-4" aria-hidden /> Novo usuário
        </Button>
      </div>

      <div className="mb-4">
        <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou matrícula..."
          className="w-full rounded-lg border border-white/10 bg-[#011640] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#618C7C] hover:border-white/20 transition-all" />
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-white/45">Carregando usuários...</div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/45">
            {busca ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
          </div>
        ) : (
          <div className="divide-y divide-white/8">
            {usuariosFiltrados.map((u) => (
              <div key={u.id} className={`flex items-center gap-3 py-3 ${!u.ativo ? 'opacity-50' : ''}`}>
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#618C7C] text-xs font-bold text-white">
                  {iniciais(u.nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">{u.nome}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PERFIL_COR[u.perfil] ?? 'bg-white/6 text-white/70'}`}>
                      {PERFIL_LABEL[u.perfil] ?? u.perfil}
                    </span>
                    {!u.ativo && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300 border border-red-500/30">Inativo</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-white/45">{u.email}</p>
                  {u.matricula && <p className="text-xs text-white/35">Matrícula: {u.matricula}</p>}
                  {u.cpf && <p className="text-xs text-white/35">CPF: {u.cpf}</p>}
                  {u.endereco && <p className="text-xs text-white/35 truncate max-w-xs">{u.endereco}</p>}
                  {u.instituicao_nome && <p className="text-xs text-white/35">{u.instituicao_nome}</p>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Button variant="secondary" className="px-2.5 py-1.5 text-xs" onClick={() => abrirEditar(u)}>
                    Editar
                  </Button>
                  <Button
                    variant={u.ativo ? 'danger' : 'ghost'}
                    className="px-2.5 py-1.5 text-xs"
                    loading={mutAlterarAtivo.isPending}
                    onClick={() => mutAlterarAtivo.mutate({ id: u.id, ativo: !u.ativo })}
                  >
                    {u.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal — Criar */}
      {modalCriar && (
        <Modal titulo="Novo usuário" onClose={() => setModalCriar(false)}>
          <CamposUsuario form={formCriar} onChange={(f) => setFormCriar(f as FormCriar)}
            cursos={cursos} modoEdicao={false} />
          <div className="mt-6 flex justify-end gap-3 border-t border-white/8 pt-4">
            <Button variant="secondary" onClick={() => setModalCriar(false)}>Cancelar</Button>
            <Button loading={mutCriar.isPending} onClick={handleCriar}>Criar usuário</Button>
          </div>
        </Modal>
      )}

      {/* Modal — Editar */}
      {usuarioEditando && (
        <Modal titulo={`Editar — ${usuarioEditando.nome}`} onClose={() => setUsuarioEditando(null)}>
          <CamposUsuario form={formEditar} onChange={(f) => setFormEditar(f as FormEditar)}
            cursos={cursos} modoEdicao={true} />
          <div className="mt-6 flex justify-end gap-3 border-t border-white/8 pt-4">
            <Button variant="secondary" onClick={() => setUsuarioEditando(null)}>Cancelar</Button>
            <Button loading={mutAtualizar.isPending} onClick={handleAtualizar}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
