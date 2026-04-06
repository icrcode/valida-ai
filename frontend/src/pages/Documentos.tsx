import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { documentosService } from '../services/documentos';
import { useAuth } from '../contexts/AuthContext';
import type { FiltrosDocumento, StatusDocumento } from '../types';
import { BadgeStatus } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const STATUS_OPCOES: { label: string; value: StatusDocumento | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Aprovado', value: 'aprovado' },
  { label: 'Reprovado', value: 'reprovado' },
  { label: 'Revisão Solicitada', value: 'revisao_solicitada' },
  { label: 'Cancelado', value: 'cancelado' },
];

export function Documentos() {
  const { usuario } = useAuth();
  const [filtros, setFiltros] = useState<FiltrosDocumento>({ page: 1, limite: 10 });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['documentos', filtros],
    queryFn: () => documentosService.listar(filtros),
  });

  function handleStatusChange(value: StatusDocumento | '') {
    setFiltros((f) => ({ ...f, status: value, page: 1 }));
  }

  function handlePagina(nova: number) {
    setFiltros((f) => ({ ...f, page: nova }));
  }

  const totalPaginas = data ? Math.ceil(data.total / (filtros.limite ?? 10)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Documentos</h2>
        {usuario?.perfil === 'estudante' && (
          <Link
            to="/documentos/novo"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Submeter Documento
          </Link>
        )}
      </div>

      {/* Filtros */}
      <Card className="flex flex-wrap gap-3 p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-status" className="text-xs font-medium text-gray-600">Status</label>
          <select
            id="filtro-status"
            value={filtros.status ?? ''}
            onChange={(e) => handleStatusChange(e.target.value as StatusDocumento | '')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPCOES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-tipo" className="text-xs font-medium text-gray-600">Tipo</label>
          <input
            id="filtro-tipo"
            type="text"
            placeholder="ex: extensao"
            value={filtros.tipo ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value, page: 1 }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Card>

      {/* Tabela */}
      {isLoading && <p className="text-center text-gray-500">Carregando...</p>}
      {isError && <p className="text-center text-red-500">Erro ao carregar documentos.</p>}

      {data && data.dados.length === 0 && (
        <p className="text-center text-gray-500">Nenhum documento encontrado.</p>
      )}
      {data && data.dados.length > 0 && (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Título</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Carga (h)</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.dados.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{doc.titulo}</td>
                  <td className="px-4 py-3 text-gray-600">{doc.tipo}</td>
                  <td className="px-4 py-3 text-gray-600">{doc.carga_horaria}h</td>
                  <td className="px-4 py-3">
                    <BadgeStatus status={doc.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(doc.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/documentos/${doc.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Paginação */}
      {data && totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            disabled={filtros.page === 1}
            onClick={() => handlePagina((filtros.page ?? 1) - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-600">
            {filtros.page} / {totalPaginas}
          </span>
          <Button
            variant="secondary"
            disabled={filtros.page === totalPaginas}
            onClick={() => handlePagina((filtros.page ?? 1) + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
