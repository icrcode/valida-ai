import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cursosService, type CursoComContagem, type CriarCursoInput } from '../services/cursos';
import { instituicoesService, type Instituicao } from '../services/instituicoes';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

// ─── Constantes ───────────────────────────────────────────────
const TURNOS = [
  { value: 'matutino',    label: 'Matutino' },
  { value: 'vespertino',  label: 'Vespertino' },
  { value: 'noturno',     label: 'Noturno' },
  { value: 'integral',    label: 'Integral' },
];
const MODALIDADES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'ead',        label: 'EAD' },
  { value: 'hibrido',    label: 'Híbrido' },
];

// ─── Tipos ────────────────────────────────────────────────────
interface FormState {
  nome: string;
  instituicao_id: string;
  carga_horaria_complementar: string;
  turno: string;
  modalidade: string;
}

const FORM_VAZIO: FormState = {
  nome: '',
  instituicao_id: '',
  carga_horaria_complementar: '200',
  turno: '',
  modalidade: '',
};

// ─── Modal ────────────────────────────────────────────────────
function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
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

const inputCls =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400';

// ─── Formulário de curso ──────────────────────────────────────
function FormCurso({
  form,
  onChange,
  instituicoes,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  instituicoes: Instituicao[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Instituição */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Instituição <span className="text-red-500">*</span>
        </label>
        <select
          value={form.instituicao_id}
          onChange={(e) => onChange({ ...form, instituicao_id: e.target.value })}
          className={inputCls}
        >
          <option value="">Selecione uma instituição...</option>
          {instituicoes
            .filter((i) => i.ativa)
            .map((i) => (
              <option key={i.id} value={i.id}>
                [{i.sigla}] {i.nome}
              </option>
            ))}
        </select>
      </div>

      {/* Nome */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Nome do curso <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.nome}
          onChange={(e) => onChange({ ...form, nome: e.target.value })}
          placeholder="Ex: Ciência da Computação"
          className={inputCls}
        />
      </div>

      {/* Carga horária */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Carga horária complementar (horas) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min={1}
          max={9999}
          value={form.carga_horaria_complementar}
          onChange={(e) => onChange({ ...form, carga_horaria_complementar: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* Turno + Modalidade */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Turno</label>
          <select
            value={form.turno}
            onChange={(e) => onChange({ ...form, turno: e.target.value })}
            className={inputCls}
          >
            <option value="">Não definido</option>
            {TURNOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Modalidade</label>
          <select
            value={form.modalidade}
            onChange={(e) => onChange({ ...form, modalidade: e.target.value })}
            className={inputCls}
          >
            <option value="">Não definida</option>
            {MODALIDADES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Badge de turno/modalidade ─────────────────────────────────
function Badge({ texto }: { texto: string }) {
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 capitalize">
      {texto}
    </span>
  );
}

// ─── Página principal ─────────────────────────────────────────
export function Cursos() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [modalCriar, setModalCriar] = useState(false);
  const [editando, setEditando] = useState<CursoComContagem | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [filtroInstituicao, setFiltroInstituicao] = useState('');
  const [busca, setBusca] = useState('');

  const { data: cursos = [], isLoading } = useQuery<CursoComContagem[]>({
    queryKey: ['cursos-admin', filtroInstituicao],
    queryFn: () => cursosService.listarAdmin(filtroInstituicao || undefined),
  });

  const { data: instituicoes = [] } = useQuery<Instituicao[]>({
    queryKey: ['instituicoes'],
    queryFn: instituicoesService.listar,
    staleTime: 60_000,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['cursos-admin'] });
    queryClient.invalidateQueries({ queryKey: ['cursos'] });
  };

  const mutCriar = useMutation({
    mutationFn: (dados: CriarCursoInput) => cursosService.criar(dados),
    onSuccess: () => {
      addToast('Curso criado com sucesso!', 'success');
      setModalCriar(false);
      setForm(FORM_VAZIO);
      invalidar();
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { data?: { erro?: string } } };
      addToast(apiErr?.response?.data?.erro ?? 'Erro ao criar curso', 'error');
    },
  });

  const mutAtualizar = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Omit<CriarCursoInput, 'codigo'> }) =>
      cursosService.atualizar(id, dados),
    onSuccess: () => {
      addToast('Curso atualizado!', 'success');
      setEditando(null);
      setForm(FORM_VAZIO);
      invalidar();
    },
    onError: () => addToast('Erro ao atualizar curso', 'error'),
  });

  const mutAtivo = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      cursosService.alterarAtivo(id, ativo),
    onSuccess: (_, vars) => {
      addToast(vars.ativo ? 'Curso ativado!' : 'Curso desativado!', 'success');
      invalidar();
    },
    onError: () => addToast('Erro ao alterar status', 'error'),
  });

  function abrirCriar() {
    setForm(FORM_VAZIO);
    setModalCriar(true);
  }

  function abrirEditar(curso: CursoComContagem) {
    setForm({
      nome: curso.nome,
      instituicao_id: curso.instituicao_id,
      carga_horaria_complementar: String(curso.carga_horaria_complementar),
      turno: curso.turno ?? '',
      modalidade: curso.modalidade ?? '',
    });
    setEditando(curso);
  }

  function validarForm(): string | null {
    if (!form.nome.trim()) return 'Nome é obrigatório';
    if (!form.instituicao_id) return 'Selecione uma instituição';
    const carga = Number(form.carga_horaria_complementar);
    if (!carga || carga < 1) return 'Carga horária deve ser um número positivo';
    return null;
  }

  function handleCriar() {
    const erro = validarForm();
    if (erro) { addToast(erro, 'error'); return; }
    mutCriar.mutate({
      nome: form.nome.trim(),
      instituicao_id: form.instituicao_id,
      carga_horaria_complementar: Number(form.carga_horaria_complementar),
      turno: form.turno || undefined,
      modalidade: form.modalidade || undefined,
    });
  }

  function handleAtualizar() {
    if (!editando) return;
    const erro = validarForm();
    if (erro) { addToast(erro, 'error'); return; }
    mutAtualizar.mutate({
      id: editando.id,
      dados: {
        nome: form.nome.trim(),
        instituicao_id: form.instituicao_id,
        carga_horaria_complementar: Number(form.carga_horaria_complementar),
        turno: form.turno || undefined,
        modalidade: form.modalidade || undefined,
      },
    });
  }

  const filtrados = cursos.filter((c) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.codigo.toLowerCase().includes(q) ||
      c.instituicao_nome.toLowerCase().includes(q) ||
      c.instituicao_sigla.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cursos</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Gerencie os cursos vinculados às instituições
          </p>
        </div>
        <Button onClick={abrirCriar}>+ Novo curso</Button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          value={filtroInstituicao}
          onChange={(e) => setFiltroInstituicao(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 sm:w-64"
        >
          <option value="">Todas as instituições</option>
          {instituicoes.map((i) => (
            <option key={i.id} value={i.id}>
              [{i.sigla}] {i.nome}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, código ou instituição..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400"
        />
      </div>

      {/* Estatística rápida */}
      {!isLoading && filtrados.length > 0 && (
        <p className="mb-3 text-xs text-gray-400">
          {filtrados.length} curso{filtrados.length !== 1 ? 's' : ''} —{' '}
          {filtrados.reduce((s, c) => s + c.total_estudantes, 0)} estudante
          {filtrados.reduce((s, c) => s + c.total_estudantes, 0) !== 1 ? 's' : ''} no total
        </p>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <Card>
            <p className="py-8 text-center text-sm text-gray-400">Carregando cursos...</p>
          </Card>
        ) : filtrados.length === 0 ? (
          <Card>
            <p className="py-8 text-center text-sm text-gray-400">
              {busca || filtroInstituicao
                ? 'Nenhum curso encontrado para os filtros aplicados.'
                : 'Nenhum curso cadastrado ainda.'}
            </p>
          </Card>
        ) : (
          filtrados.map((curso) => (
            <Card
              key={curso.id}
              className={`transition-opacity ${!curso.ativo ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Info */}
                <div className="min-w-0 flex-1">
                  {/* Linha 1: código + nome + status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">
                      {curso.codigo}
                    </span>
                    <h3 className="text-sm font-semibold text-gray-900">{curso.nome}</h3>
                    {!curso.ativo && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                        Inativo
                      </span>
                    )}
                  </div>

                  {/* Linha 2: instituição */}
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-medium">{curso.instituicao_sigla}</span>
                    <span className="text-gray-400">—</span>
                    {curso.instituicao_nome}
                  </p>

                  {/* Linha 3: badges + carga horária + alunos */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {curso.turno && <Badge texto={curso.turno} />}
                    {curso.modalidade && <Badge texto={curso.modalidade} />}
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {curso.carga_horaria_complementar}h complementares
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs font-medium ${
                        curso.total_estudantes > 0 ? 'text-green-700' : 'text-gray-400'
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {curso.total_estudantes} aluno{curso.total_estudantes !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => abrirEditar(curso)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant={curso.ativo ? 'danger' : 'ghost'}
                    className="px-3 py-1.5 text-xs"
                    loading={mutAtivo.isPending}
                    onClick={() => mutAtivo.mutate({ id: curso.id, ativo: !curso.ativo })}
                  >
                    {curso.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal — Novo curso */}
      {modalCriar && (
        <Modal titulo="Novo curso" onClose={() => setModalCriar(false)}>
          <FormCurso form={form} onChange={setForm} instituicoes={instituicoes} />
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={() => setModalCriar(false)}>
              Cancelar
            </Button>
            <Button loading={mutCriar.isPending} onClick={handleCriar}>
              Criar curso
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal — Editar */}
      {editando && (
        <Modal titulo={`Editar — ${editando.nome}`} onClose={() => setEditando(null)}>
          <FormCurso form={form} onChange={setForm} instituicoes={instituicoes} />
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button loading={mutAtualizar.isPending} onClick={handleAtualizar}>
              Salvar alterações
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
