import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentosService } from '../services/documentos';
import { useAuth } from '../contexts/AuthContext';
import { BadgeStatus } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DetalheDocumento() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [observacoes, setObservacoes] = useState('');

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
  };

  const mutAprovar = useMutation({
    mutationFn: () => documentosService.aprovar(id!, observacoes || undefined),
    onSuccess: invalidate,
  });

  const mutReprovar = useMutation({
    mutationFn: () => documentosService.reprovar(id!, observacoes),
    onSuccess: invalidate,
  });

  const mutRevisao = useMutation({
    mutationFn: () => documentosService.solicitarRevisao(id!, observacoes),
    onSuccess: invalidate,
  });

  const mutCancelar = useMutation({
    mutationFn: () => documentosService.cancelar(id!),
    onSuccess: () => {
      invalidate();
      navigate('/documentos');
    },
  });

  const mutDownload = useMutation({
    mutationFn: () => documentosService.buscarUrlDownload(id!),
    onSuccess: ({ url }) => window.open(url, '_blank'),
  });

  const isCoordenador = usuario?.perfil === 'coordenador' || usuario?.perfil === 'admin';
  const isEstudante = usuario?.perfil === 'estudante';
  const isPending = doc?.status === 'pendente';

  if (isLoading) return <p className="text-center text-gray-500">Carregando...</p>;
  if (!doc) return <p className="text-center text-red-500">Documento não encontrado.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{doc.titulo}</h2>
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
      {isCoordenador && isPending && (
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
            >
              Aprovar
            </Button>
            <Button
              variant="danger"
              onClick={() => mutReprovar.mutate()}
              loading={mutReprovar.isPending}
              disabled={!observacoes.trim()}
            >
              Reprovar
            </Button>
            <Button
              variant="secondary"
              onClick={() => mutRevisao.mutate()}
              loading={mutRevisao.isPending}
              disabled={!observacoes.trim()}
            >
              Solicitar Revisão
            </Button>
          </div>
          {(mutReprovar.isError || mutRevisao.isError || mutAprovar.isError) && (
            <p className="mt-2 text-sm text-red-500">Erro ao realizar ação.</p>
          )}
        </Card>
      )}

      {/* Cancelar (estudante, pendente) */}
      {isEstudante && isPending && (
        <Card>
          <h3 className="mb-3 font-medium text-gray-900">Cancelar Submissão</h3>
          <Button
            variant="danger"
            loading={mutCancelar.isPending}
            onClick={() => {
              if (confirm('Confirmar cancelamento?')) mutCancelar.mutate();
            }}
          >
            Cancelar Documento
          </Button>
        </Card>
      )}

      {/* Histórico */}
      {historico && historico.length > 0 && (
        <Card>
          <h3 className="mb-3 font-medium text-gray-900">Histórico</h3>
          <ol className="flex flex-col gap-3">
            {historico.map((h) => (
              <li key={h.id} className="flex gap-3">
                <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{h.acao}</p>
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
