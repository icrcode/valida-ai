import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usuariosService, type CriarUsuarioInput, type AtualizarUsuarioInput } from '../services/usuarios';
import { cursosService, type Curso } from '../services/cursos';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PERFIL_LABEL, PERFIL_COR, iniciais } from '../utils/perfil';
import type { Perfil, Usuario } from '../types';

const PERFIS: Perfil[] = ['estudante', 'coordenador', 'admin'];

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

interface FormState {
  nome: string;
  email: string;
  perfil: Perfil;
  matricula: string;
  curso_id: string;
}

const formInicial: FormState = { nome: '', email: '', perfil: 'estudante', matricula: '', curso_id: '' };

interface ModalProps {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ titulo, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

interface FormUsuarioProps {
  form: FormState;
  onChange: (f: FormState) => void;
  cursos: Curso[];
  isEdit?: boolean;
}

function FormUsuario({ form, onChange, cursos, isEdit = false }: FormUsuarioProps) {
  const cursosPorInstituicao = groupBy(cursos, (c) => c.instituicao_nome);
  const inputCls = 'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Nome completo</label>
        <input
          type="text"
          value={form.nome}
          onChange={(e) => onChange({ ...form, nome: e.target.value })}
          placeholder="Nome completo"
          className={inputCls}
        />
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            placeholder="email@instituicao.edu.br"
            className={inputCls}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Perfil</label>
        <select
          value={form.perfil}
          onChange={(e) => onChange({ ...form, perfil: e.target.value as Perfil })}
          className={inputCls}
        >
          {PERFIS.map((p) => (
            <option key={p} value={p}>{PERFIL_LABEL[p] ?? p}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          Curso <span className="text-xs text-gray-400">(opcional)</span>
        </label>
        <select
          value={form.curso_id}
          onChange={(e) => onChange({ ...form, curso_id: e.target.value })}
          className={inputCls}
        >
          <option value="">Nenhum curso</option>
          {Object.entries(cursosPorInstituicao).map(([inst, lista]) => (
            <optgroup key={inst} label={inst}>
              {lista.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {(form.perfil === 'estudante') && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Matrícula <span className="text-xs text-gray-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.matricula}
            onChange={(e) => onChange({ ...form, matricula: e.target.value })}
            placeholder="Número de matrícula"
            className={inputCls}
          />
        </div>
      )}
    </div>
  );
}

export function Usuarios() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [modalCriar, setModalCriar] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormState>(formInicial);
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
    mutationFn: (dados: CriarUsuarioInput) => usuariosService.criar(dados),
    onSuccess: () => {
      addToast('Usuário criado com sucesso!', 'success');
      setModalCriar(false);
      setForm(formInicial);
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
      setForm(formInicial);
      invalidar();
    },
    onError: () => addToast('Erro ao atualizar usuário', 'error'),
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
    setForm(formInicial);
    setModalCriar(true);
  }

  function abrirEditar(u: Usuario) {
    setForm({
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      matricula: u.matricula ?? '',
      curso_id: u.curso_id ?? '',
    });
    setUsuarioEditando(u);
  }

  function handleCriar() {
    if (!form.nome.trim() || !form.email.trim()) {
      addToast('Preencha nome e e-mail', 'error');
      return;
    }
    mutCriar.mutate({
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase(),
      perfil: form.perfil,
      matricula: form.matricula.trim() || undefined,
      curso_id: form.curso_id || undefined,
    });
  }

  function handleAtualizar() {
    if (!usuarioEditando) return;
    if (!form.nome.trim()) {
      addToast('Nome não pode ficar vazio', 'error');
      return;
    }
    mutAtualizar.mutate({
      id: usuarioEditando.id,
      dados: {
        nome: form.nome.trim(),
        perfil: form.perfil,
        matricula: form.matricula.trim() || null,
        curso_id: form.curso_id || null,
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
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Usuários</h2>
        <Button onClick={abrirCriar}>+ Novo usuário</Button>
      </div>

      {/* Busca */}
      <div className="mb-4">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou matrícula..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400"
        />
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            Carregando usuários...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            {busca ? 'Nenhum usuário encontrado para essa busca.' : 'Nenhum usuário cadastrado.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {usuariosFiltrados.map((u) => (
              <div key={u.id} className={`flex items-center gap-3 py-3 ${!u.ativo ? 'opacity-50' : ''}`}>
                {/* Avatar */}
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {iniciais(u.nome)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">{u.nome}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PERFIL_COR[u.perfil] ?? 'bg-gray-100 text-gray-700'}`}>
                      {PERFIL_LABEL[u.perfil] ?? u.perfil}
                    </span>
                    {!u.ativo && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Inativo</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-500">{u.email}</p>
                  {u.matricula && <p className="text-xs text-gray-400">Matrícula: {u.matricula}</p>}
                  {u.instituicao_nome && <p className="text-xs text-gray-400">{u.instituicao_nome}</p>}
                </div>

                {/* Ações */}
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
          <FormUsuario form={form} onChange={setForm} cursos={cursos} />
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalCriar(false)}>Cancelar</Button>
            <Button loading={mutCriar.isPending} onClick={handleCriar}>Criar usuário</Button>
          </div>
        </Modal>
      )}

      {/* Modal — Editar */}
      {usuarioEditando && (
        <Modal titulo="Editar usuário" onClose={() => setUsuarioEditando(null)}>
          <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
            {usuarioEditando.email}
          </div>
          <FormUsuario form={form} onChange={setForm} cursos={cursos} isEdit />
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setUsuarioEditando(null)}>Cancelar</Button>
            <Button loading={mutAtualizar.isPending} onClick={handleAtualizar}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
