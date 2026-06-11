import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentosService } from '../services/documentos';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { BadgeStatus } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T').replace(/(\+\d{2})$/, '$1:00'));
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR');
}

const ACAO_LABEL: Record<string, string> = {
  submetido:          'Documento submetido',
  aprovado:           'Documento aprovado',
  reprovado:          'Documento reprovado',
  revisao_solicitada: 'Revisão solicitada',
  cancelado:          'Documento cancelado',
};

export function DetalheDocumento() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [observacoes, setObservacoes] = useState('');
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const [iframeOk, setIframeOk] = useState(false);
  const iframeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['documento', id],
    queryFn: () => documentosService.buscarPorId(id!),
    enabled: !!id,
  });

  const { data: historico } = useQuery({
    queryKey: ['historico', id],
    queryFn: () => documentosService.historico(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documento', id] });
    queryClient.invalidateQueries({ queryKey: ['historico', id] });
    queryClient.invalidateQueries({ queryKey: ['documentos'] });
    queryClient.invalidateQueries({ queryKey: ['documentos-contagem'] });
  };

  const mutAprovar = useMutation({
    mutationFn: () => documentosService.aprovar(id!, observacoes || undefined),
    onSuccess: () => { invalidate(); setObservacoes(''); addToast('Documento aprovado com sucesso!', 'success'); },
    onError: () => addToast('Erro ao aprovar o documento.', 'error'),
  });

  const mutReprovar = useMutation({
    mutationFn: () => documentosService.reprovar(id!, observacoes),
    onSuccess: () => { invalidate(); setObservacoes(''); addToast('Documento reprovado.', 'info'); },
    onError: () => addToast('Erro ao reprovar o documento.', 'error'),
  });

  const mutRevisao = useMutation({
    mutationFn: () => documentosService.solicitarRevisao(id!, observacoes),
    onSuccess: () => { invalidate(); setObservacoes(''); addToast('Revisão solicitada ao estudante.', 'info'); },
    onError: () => addToast('Erro ao solicitar revisão.', 'error'),
  });

  const mutCancelar = useMutation({
    mutationFn: () => documentosService.cancelar(id!),
    onSuccess: () => { invalidate(); addToast('Documento cancelado.', 'info'); navigate('/documentos'); },
    onError: () => addToast('Erro ao cancelar o documento.', 'error'),
  });

  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ['documento-url', id],
    queryFn: () => documentosService.buscarUrlDownload(id!),
    enabled: !!id && !!doc,
    staleTime: 50 * 60 * 1000,
  });

  const mutDownload = useMutation({
    mutationFn: () => documentosService.buscarUrlDownload(id!),
    onSuccess: ({ url }) => window.open(url, '_blank'),
    onError: () => addToast('Erro ao gerar link de download.', 'error'),
  });

  const isCoordenador = usuario?.perfil === 'coordenador' || usuario?.perfil === 'admin';
  const isEstudante   = usuario?.perfil === 'estudante';
  const isPendente    = doc?.status === 'pendente';
  const podeAvaliar   = isCoordenador && (isPendente || doc?.status === 'revisao_solicitada');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8 text-[#618C7C]" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-400">Documento não encontrado.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/documentos')}>
          Voltar para Documentos
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-up">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-white truncate">{doc.titulo}</h2>
        <Button variant="secondary" onClick={() => navigate(-1)} className="flex-shrink-0">
          Voltar
        </Button>
      </div>

      {/* Detalhes */}
      <Card>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: 'Status',       value: <BadgeStatus status={doc.status} /> },
            { label: 'Tipo',         value: doc.tipo },
            { label: 'Carga Horária',value: `${doc.carga_horaria}h` },
            { label: 'Arquivo',      value: doc.nome_arquivo },
            { label: 'Tamanho',      value: formatBytes(doc.tamanho_arquivo) },
            { label: 'Submetido em', value: formatDate(doc.criado_em) },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-white/35">{label}</dt>
              <dd className="mt-1 text-sm text-white">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 border-t border-white/8 pt-4">
          <Button variant="secondary" loading={mutDownload.isPending} onClick={() => mutDownload.mutate()}>
            Baixar PDF
          </Button>
        </div>
      </Card>

      {/* Pré-visualização PDF */}
      <Card>
        <h3 className="mb-4 font-medium text-white">Pré-visualização</h3>
        {previewLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-6 w-6 text-[#618C7C]" />
            <span className="ml-3 text-sm text-white/45">Carregando documento...</span>
          </div>
        )}
        {previewData && (
          <>
            {!iframeOk && (
              <div className="flex items-center justify-center py-4">
                <Spinner className="h-5 w-5 text-[#618C7C]" />
                <span className="ml-2 text-sm text-white/45">Preparando visualização...</span>
              </div>
            )}
            <iframe
              key={previewData.url}
              src={previewData.url}
              title="Pré-visualização do documento PDF"
              className={`w-full rounded-lg border border-white/10 bg-black/20 transition-opacity duration-300 ${iframeOk ? 'opacity-100' : 'opacity-0 h-0'}`}
              style={iframeOk ? { height: '70vh', minHeight: '480px' } : {}}
              onLoad={() => {
                if (iframeTimer.current) clearTimeout(iframeTimer.current);
                iframeTimer.current = setTimeout(() => setIframeOk(true), 300);
              }}
            />
          </>
        )}
        {!previewLoading && !previewData && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-white/40">Não foi possível carregar a pré-visualização.</p>
            <Button variant="secondary" loading={mutDownload.isPending} onClick={() => mutDownload.mutate()}>
              Baixar PDF
            </Button>
          </div>
        )}
      </Card>

      {/* Ações do coordenador */}
      {podeAvaliar && (
        <Card>
          <h3 className="mb-4 font-medium text-white">Avaliar Documento</h3>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações (obrigatórias para reprovar e solicitar revisão)"
            rows={3}
            className="mb-4 w-full rounded-lg border border-white/10 bg-[#011640] px-3 py-2 text-sm text-white placeholder:text-white/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:border-[#618C7C]/50 hover:border-white/20 resize-none"
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => mutAprovar.mutate()} loading={mutAprovar.isPending}
              disabled={mutReprovar.isPending || mutRevisao.isPending}>
              Aprovar
            </Button>
            <Button variant="danger" onClick={() => mutReprovar.mutate()} loading={mutReprovar.isPending}
              disabled={!observacoes.trim() || mutAprovar.isPending || mutRevisao.isPending}>
              Reprovar
            </Button>
            <Button variant="secondary" onClick={() => mutRevisao.mutate()} loading={mutRevisao.isPending}
              disabled={!observacoes.trim() || mutAprovar.isPending || mutReprovar.isPending}>
              Solicitar Revisão
            </Button>
          </div>
          {!observacoes.trim() && (
            <p className="mt-2 text-xs text-white/35">
              Preencha as observações para reprovar ou solicitar revisão.
            </p>
          )}
        </Card>
      )}

      {/* Cancelar */}
      {isEstudante && isPendente && (
        <Card>
          <h3 className="mb-3 font-medium text-white">Cancelar Submissão</h3>
          {!confirmarCancelamento ? (
            <Button variant="danger" onClick={() => setConfirmarCancelamento(true)}>
              Cancelar Documento
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-white/65">Tem certeza? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <Button variant="danger" loading={mutCancelar.isPending} onClick={() => mutCancelar.mutate()}>
                  Confirmar cancelamento
                </Button>
                <Button variant="secondary" onClick={() => setConfirmarCancelamento(false)}>
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Histórico */}
      {historico && historico.length > 0 && (
        <Card>
          <h3 className="mb-4 font-medium text-white">Histórico</h3>
          <ol className="flex flex-col gap-4">
            {historico.map((h) => (
              <li key={h.id} className="flex gap-3">
                <div className="mt-1.5 flex-shrink-0">
                  <span className="block h-2 w-2 rounded-full bg-[#618C7C]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {ACAO_LABEL[h.acao] ?? h.acao}
                  </p>
                  {h.observacoes && (
                    <p className="mt-0.5 text-sm text-white/55">{h.observacoes}</p>
                  )}
                  <p className="mt-0.5 text-xs text-white/35">
                    {formatDate(h.criado_em)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
