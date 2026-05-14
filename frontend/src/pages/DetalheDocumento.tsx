import { useState } from 'react';
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

const ACAO_LABEL: Record<string, string> = {
  submetido: 'Documento submetido',
  aprovado: 'Documento aprovado',
  reprovado: 'Documento reprovado',
  revisao_solicitada: 'Revisão solicitada',
  cancelado: 'Documento cancelado',
};

export function DetalheDocumento() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [observacoes, setObservacoes] = useState('');
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);

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
    onSuccess: () => {
      invalidate();
      setObservacoes('');
      addToast('Documento aprovado com sucesso!', 'success');
    },
    onError: () => addToast('Erro ao aprovar o documento.', 'error'),
  });

  const mutReprovar = useMutation({
    mutationFn: () => documentosService.reprovar(id!, observacoes),
    onSuccess: () => {
      invalidate();
      setObservacoes('');
      addToast('Documento reprovado.', 'info');
    },
    onError: () => addToast('Erro ao reprovar o documento.', 'error'),
  });

  const mutRevisao = useMutation({
    mutationFn: () => documentosService.solicitarRevisao(id!, observacoes),
    onSuccess: () => {
      invalidate();
      setObservacoes('');
      addToast('Revisão solicitada ao estudante.', 'info');
    },
    onError: () => addToast('Erro ao solicitar revisão.', 'error'),
  });

  const mutCancelar = useMutation({
    mutationFn: () => documentosService.cancelar(id!),
    onSuccess: () => {
      invalidate();
      addToast('Documento cancelado.', 'info');
      navigate('/documentos');
    },
    onError: () => addToast('Erro ao cancelar o documento.', 'error'),
  });

  const mutDownload = useMutation({
    mutationFn: () => documentosService.buscarUrlDownload(id!),
    onSuccess: ({ url }) => window.open(url, '_blank'),
    onError: () => addToast('Erro ao gerar link de download.', 'error'),
  });

  const isCoordenador = usuario?.perfil === 'coordenador' || usuario?.perfil === 'admin';
  const isEstudante = usuario?.perfil === 'estudante';
  const isPendente = doc?.status === 'pendente';
  const podeAvaliar = isCoordenador && (isPendente || doc?.status === 'revisao_solicitada');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-500">Documento não encontrado.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/documentos')}>
          Voltar para Documentos
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 truncate">{doc.titulo}</h2>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>

      {/* Detalhes */}
      <Card>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: 'Status', value: <BadgeStatus status={doc.status} /> },
            { label: 'Tipo', value: doc.tipo },
            { label: 'Carga Horária', value: `${doc.carga_horaria}h` },
            { label: 'Arquivo', value: doc.nome_arquivo },
            { label: 'Tamanho', value: formatBytes(doc.tamanho_arquivo) },
            {
              label: 'Submetido em',
              value: new Date(doc.criado_em).toLocaleString('pt-BR'),
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 text-sm text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4">
          <Button
            variant="secondary"
            loading={mutDownload.isPending}
            onClick={() => mutDownload.mutate()}
          >
            Baixar PDF
          </Button>
        </div>
      </Card>

      {/* Ações do coordenador */}
      {podeAvaliar && (
        <Card>
          <h3 className="mb-3 font-medium text-gray-900">Avaliar Documento</h3>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações (obrigatórias para reprovar e solicitar revisão)"
            rows={3}
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => mutAprovar.mutate()}
              loading={mutAprovar.isPending}
              disabled={mutReprovar.isPending || mutRevisao.isPending}
            >
              Aprovar
            </Button>
            <Button
              variant="danger"
              onClick={() => mutReprovar.mutate()}
              loading={mutReprovar.isPending}
              disabled={!observacoes.trim() || mutAprovar.isPending || mutRevisao.isPending}
            >
              Reprovar
            </Button>
            <Button
              variant="secondary"
              onClick={() => mutRevisao.mutate()}
              loading={mutRevisao.isPending}
              disabled={!observacoes.trim() || mutAprovar.isPending || mutReprovar.isPending}
            >
              Solicitar Revisão
            </Button>
          </div>
          {!observacoes.trim() && (
            <p className="mt-2 text-xs text-gray-400">
              Preencha as observações para reprovar ou solicitar revisão.
            </p>
          )}
        </Card>
      )}

      {/* Cancelar (estudante, pendente) */}
      {isEstudante && isPendente && (
        <Card>
          <h3 className="mb-3 font-medium text-gray-900">Cancelar Submissão</h3>
          {!confirmarCancelamento ? (
            <Button variant="danger" onClick={() => setConfirmarCancelamento(true)}>
              Cancelar Documento
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-700">
                Tem certeza? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  loading={mutCancelar.isPending}
                  onClick={() => mutCancelar.mutate()}
                >
                  Confirmar cancelamento
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmarCancelamento(false)}
                >
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
          <h3 className="mb-3 font-medium text-gray-900">Histórico</h3>
          <ol className="flex flex-col gap-3">
            {historico.map((h) => (
              <li key={h.id} className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {ACAO_LABEL[h.acao] ?? h.acao}
                  </p>
                  {h.observacoes && (
                    <p className="mt-0.5 text-sm text-gray-600">{h.observacoes}</p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(h.criado_em).toLocaleString('pt-BR')}
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
