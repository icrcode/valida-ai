import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  instituicoesService,
  type Instituicao,
  type CriarInstituicaoInput,
} from '../services/instituicoes';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { sanitizarUrl } from '../utils/seguranca';
import { AddIcon } from '../components/icons';

// ─── Tipos internos ───────────────────────────────────────────
interface FormState {
  nome: string;
  sigla: string;
  cnpj: string;
  email_contato: string;
  telefone: string;
  site: string;
  endereco: string;
  cidade: string;
  estado: string;
  dominios_email: string[];
  dominioInput: string;
}

const FORM_VAZIO: FormState = {
  nome: '',
  sigla: '',
  cnpj: '',
  email_contato: '',
  telefone: '',
  site: '',
  endereco: '',
  cidade: '',
  estado: '',
  dominios_email: [],
  dominioInput: '',
};

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
];

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
      role="button"
      tabIndex={-1}
      aria-label="Fechar modal"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); }}
    >
      <div className="flex min-h-full items-start justify-center px-4 py-8">
        <div
          className="w-full max-w-xl rounded-2xl bg-[#011140] shadow-xl flex flex-col"
          style={{ maxHeight: 'calc(100vh - 2rem)' }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-white/8 px-6 py-4">
            <h2 className="text-base font-semibold text-white">{titulo}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/45 hover:bg-white/6 hover:text-white/70"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Campo do formulário ──────────────────────────────────────
function Campo({
  label,
  obrigatorio,
  className,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1${className ? ` ${className}` : ''}`}>
      <label className="text-sm font-medium text-white/70">
        {label}
        {obrigatorio && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'rounded-lg border border-white/10 bg-[#011640] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#618C7C] hover:border-white/20 transition-all';

// ─── Formulário de instituição ────────────────────────────────
function FormInstituicao({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
}) {
  function adicionarDominio() {
    const d = form.dominioInput.trim().toLowerCase();
    if (!d || form.dominios_email.includes(d)) return;
    onChange({ ...form, dominios_email: [...form.dominios_email, d], dominioInput: '' });
  }

  function removerDominio(dominio: string) {
    onChange({ ...form, dominios_email: form.dominios_email.filter((x) => x !== dominio) });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Nome + Sigla */}
      <div className="grid grid-cols-3 gap-3">
        <Campo label="Nome" obrigatorio className="col-span-2">
          <input
            type="text"
            value={form.nome}
            onChange={(e) => onChange({ ...form, nome: e.target.value })}
            placeholder="Ex: Universidade Federal de SC"
            className={inputCls}
          />
        </Campo>
        <Campo label="Sigla" obrigatorio>
          <input
            type="text"
            value={form.sigla}
            onChange={(e) => onChange({ ...form, sigla: e.target.value.toUpperCase() })}
            placeholder="UFSC"
            maxLength={20}
            className={inputCls}
          />
        </Campo>
      </div>

      {/* Endereço */}
      <Campo label="Endereço">
        <input
          type="text"
          value={form.endereco}
          onChange={(e) => onChange({ ...form, endereco: e.target.value })}
          placeholder="Rua, número, complemento"
          className={inputCls}
        />
      </Campo>

      {/* Cidade + Estado */}
      <div className="grid grid-cols-3 gap-3">
        <Campo label="Cidade" className="col-span-2">
          <input
            type="text"
            value={form.cidade}
            onChange={(e) => onChange({ ...form, cidade: e.target.value })}
            placeholder="Florianópolis"
            className={inputCls}
          />
        </Campo>
        <Campo label="UF">
          <select
            value={form.estado}
            onChange={(e) => onChange({ ...form, estado: e.target.value })}
            className={inputCls}
          >
            <option value="">--</option>
            {ESTADOS_BR.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </Campo>
      </div>

      {/* Domínios de e-mail */}
      <Campo label="Domínios de e-mail aceitos">
        <div className="flex gap-2">
          <input
            type="text"
            value={form.dominioInput}
            onChange={(e) => onChange({ ...form, dominioInput: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarDominio(); } }}
            placeholder="ex: ufsc.br"
            className={`flex-1 ${inputCls}`}
          />
          <Button type="button" variant="secondary" onClick={adicionarDominio}>
            Adicionar
          </Button>
        </div>
        {form.dominios_email.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {form.dominios_email.map((d) => (
              <span
                key={d}
                className="flex items-center gap-1.5 rounded-full bg-[#618C7C]/20 px-3 py-1 text-xs font-medium text-[#7AAA9A] border border-[#618C7C]/30"
              >
                @{d}
                <button
                  type="button"
                  onClick={() => removerDominio(d)}
                  className="text-[#618C7C] hover:text-[#7AAA9A]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-white/35">
          Deixe vazio para aceitar qualquer domínio. Pressione Enter ou clique em Adicionar.
        </p>
      </Campo>

      {/* Separador — campos opcionais */}
      <div className="border-t border-white/8 pt-2">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/35">
          Informações adicionais (opcional)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="E-mail de contato">
            <input
              type="email"
              value={form.email_contato}
              onChange={(e) => onChange({ ...form, email_contato: e.target.value })}
              placeholder="contato@instituicao.edu.br"
              className={inputCls}
            />
          </Campo>
          <Campo label="Telefone">
            <input
              type="text"
              value={form.telefone}
              onChange={(e) => onChange({ ...form, telefone: e.target.value })}
              placeholder="(48) 3333-4444"
              className={inputCls}
            />
          </Campo>
          <Campo label="CNPJ">
            <input
              type="text"
              value={form.cnpj}
              onChange={(e) => onChange({ ...form, cnpj: e.target.value })}
              placeholder="00.000.000/0001-00"
              className={inputCls}
            />
          </Campo>
          <Campo label="Site">
            <input
              type="text"
              value={form.site}
              onChange={(e) => onChange({ ...form, site: e.target.value })}
              placeholder="https://www.instituicao.edu.br"
              className={inputCls}
            />
          </Campo>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────
export function Instituicoes() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [modalCriar, setModalCriar] = useState(false);
  const [editando, setEditando] = useState<Instituicao | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [busca, setBusca] = useState('');

  const { data: instituicoes = [], isLoading } = useQuery<Instituicao[]>({
    queryKey: ['instituicoes'],
    queryFn: instituicoesService.listar,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['instituicoes'] });

  const mutCriar = useMutation({
    mutationFn: (dados: CriarInstituicaoInput) => instituicoesService.criar(dados),
    onSuccess: () => {
      addToast('Instituição criada com sucesso!', 'success');
      setModalCriar(false);
      setForm(FORM_VAZIO);
      invalidar();
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { data?: { erro?: string } } };
      addToast(apiErr?.response?.data?.erro ?? 'Erro ao criar instituição', 'error');
    },
  });

  const mutAtualizar = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: CriarInstituicaoInput }) =>
      instituicoesService.atualizar(id, dados),
    onSuccess: () => {
      addToast('Instituição atualizada!', 'success');
      setEditando(null);
      setForm(FORM_VAZIO);
      invalidar();
    },
    onError: () => addToast('Erro ao atualizar instituição', 'error'),
  });

  const mutAtiva = useMutation({
    mutationFn: ({ id, ativa }: { id: string; ativa: boolean }) =>
      instituicoesService.alterarAtiva(id, ativa),
    onSuccess: (_, vars) => {
      addToast(vars.ativa ? 'Instituição ativada!' : 'Instituição desativada!', 'success');
      invalidar();
    },
    onError: () => addToast('Erro ao alterar status', 'error'),
  });

  function abrirCriar() {
    setForm(FORM_VAZIO);
    setModalCriar(true);
  }

  function abrirEditar(inst: Instituicao) {
    setForm({
      nome: inst.nome,
      sigla: inst.sigla,
      cnpj: inst.cnpj ?? '',
      email_contato: inst.email_contato ?? '',
      telefone: inst.telefone ?? '',
      site: inst.site ?? '',
      endereco: inst.endereco ?? '',
      cidade: inst.cidade ?? '',
      estado: inst.estado ?? '',
      dominios_email: inst.dominios_email,
      dominioInput: '',
    });
    setEditando(inst);
  }

  function formParaInput(f: FormState): CriarInstituicaoInput {
    return {
      nome: f.nome.trim(),
      sigla: f.sigla.trim(),
      cnpj: f.cnpj.trim() || undefined,
      email_contato: f.email_contato.trim() || undefined,
      telefone: f.telefone.trim() || undefined,
      site: f.site.trim() || undefined,
      endereco: f.endereco.trim() || undefined,
      cidade: f.cidade.trim() || undefined,
      estado: f.estado || undefined,
      dominios_email: f.dominios_email,
    };
  }

  function handleCriar() {
    if (!form.nome.trim() || !form.sigla.trim()) {
      addToast('Nome e sigla são obrigatórios', 'error');
      return;
    }
    mutCriar.mutate(formParaInput(form));
  }

  function handleAtualizar() {
    if (!editando) return;
    if (!form.nome.trim() || !form.sigla.trim()) {
      addToast('Nome e sigla são obrigatórios', 'error');
      return;
    }
    mutAtualizar.mutate({ id: editando.id, dados: formParaInput(form) });
  }

  const filtradas = instituicoes.filter((i) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      i.nome.toLowerCase().includes(q) ||
      i.sigla.toLowerCase().includes(q) ||
      (i.cidade ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-up">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Instituições</h2>
          <p className="mt-0.5 text-sm text-white/45">
            Gerencie as instituições cadastradas na plataforma
          </p>
        </div>
        <Button onClick={abrirCriar} className="flex items-center gap-1.5">
          <AddIcon className="h-4 w-4" aria-hidden /> Nova instituição
        </Button>
      </div>

      {/* Busca */}
      <div className="mb-4">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, sigla ou cidade..."
          className="w-full rounded-lg border border-white/10 bg-[#011640] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#618C7C] hover:border-white/20 transition-all"
        />
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <Card>
            <p className="py-8 text-center text-sm text-white/45">Carregando instituições...</p>
          </Card>
        ) : filtradas.length === 0 ? (
          <Card>
            <p className="py-8 text-center text-sm text-white/45">
              {busca ? 'Nenhuma instituição encontrada.' : 'Nenhuma instituição cadastrada ainda.'}
            </p>
          </Card>
        ) : (
          filtradas.map((inst) => (
            <Card key={inst.id} className={`transition-opacity ${!inst.ativa ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                {/* Info principal */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#618C7C]/20 px-2 py-0.5 text-xs font-bold text-[#7AAA9A] border border-[#618C7C]/30">
                      {inst.sigla}
                    </span>
                    <h3 className="text-sm font-semibold text-white">{inst.nome}</h3>
                    {!inst.ativa && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300 border border-red-500/30">
                        Inativa
                      </span>
                    )}
                  </div>

                  {/* Localização */}
                  {(inst.endereco || inst.cidade || inst.estado) && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-white/45">
                      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {[inst.endereco, inst.cidade, inst.estado].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {/* Domínios */}
                  {inst.dominios_email.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {inst.dominios_email.map((d) => (
                        <span
                          key={d}
                          className="rounded-full bg-white/3 px-2.5 py-0.5 text-xs text-white/65"
                        >
                          @{d}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-white/35">Qualquer domínio aceito</p>
                  )}

                  {/* Contatos extras */}
                  <div className="mt-2 flex flex-wrap gap-3">
                    {inst.email_contato && (
                      <a
                        href={`mailto:${inst.email_contato}`}
                        className="flex items-center gap-1 text-xs text-[#618C7C] hover:underline"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {inst.email_contato}
                      </a>
                    )}
                    {inst.telefone && (
                      <span className="flex items-center gap-1 text-xs text-white/45">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {inst.telefone}
                      </span>
                    )}
                    {sanitizarUrl(inst.site) && (
                      <a
                        href={sanitizarUrl(inst.site)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[#618C7C] hover:underline"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {inst.site}
                      </a>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => abrirEditar(inst)}>
                    Editar
                  </Button>
                  <Button
                    variant={inst.ativa ? 'danger' : 'ghost'}
                    className="px-3 py-1.5 text-xs"
                    loading={mutAtiva.isPending}
                    onClick={() => mutAtiva.mutate({ id: inst.id, ativa: !inst.ativa })}
                  >
                    {inst.ativa ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal — Nova instituição */}
      {modalCriar && (
        <Modal titulo="Nova instituição" onClose={() => setModalCriar(false)}>
          <FormInstituicao form={form} onChange={setForm} />
          <div className="mt-6 flex justify-end gap-3 border-t border-white/8 pt-4">
            <Button variant="secondary" onClick={() => setModalCriar(false)}>
              Cancelar
            </Button>
            <Button loading={mutCriar.isPending} onClick={handleCriar}>
              Criar instituição
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal — Editar */}
      {editando && (
        <Modal titulo={`Editar — ${editando.nome}`} onClose={() => setEditando(null)}>
          <FormInstituicao form={form} onChange={setForm} />
          <div className="mt-6 flex justify-end gap-3 border-t border-white/8 pt-4">
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
