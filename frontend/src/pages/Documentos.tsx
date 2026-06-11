import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { documentosService } from '../services/documentos';
import { useAuth } from '../contexts/AuthContext';
import type { FiltrosDocumento, StatusDocumento } from '../types';
import { BadgeStatus } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { UploadIcon } from '../components/icons';

const STATUS_OPCOES: { label: string; value: StatusDocumento | '' }[] = [
  { label: 'Todos',             value: '' },
  { label: 'Pendente',          value: 'pendente' },
  { label: 'Aprovado',          value: 'aprovado' },
  { label: 'Reprovado',         value: 'reprovado' },
  { label: 'Revisão Solicitada',value: 'revisao_solicitada' },
  { label: 'Cancelado',         value: 'cancelado' },
];

const selectCls = 'rounded-lg border border-white/10 bg-[#011640] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:border-[#618C7C]/50 hover:border-white/20 transition-all [&>option]:bg-[#011640]';

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
    <div className="flex flex-col gap-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Documentos</h2>
        {usuario?.perfil === 'estudante' && (
          <Link to="/documentos/novo"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#618C7C] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#7AAA9A] hover:shadow-[0_0_20px_rgba(97,140,124,0.25)]">
            <UploadIcon className="h-4 w-4" aria-hidden />
            Submeter Documento
          </Link>
        )}
      </div>

      {/* Filtros */}
      <Card className="flex flex-wrap gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-status" className="text-xs font-medium text-white/50">Status</label>
          <select id="filtro-status" value={filtros.status ?? ''} className={selectCls}
            onChange={(e) => handleStatusChange(e.target.value as StatusDocumento | '')}>
            {STATUS_OPCOES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-tipo" className="text-xs font-medium text-white/50">Tipo</label>
          <input id="filtro-tipo" type="text" placeholder="ex: extensao" value={filtros.tipo ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value, page: 1 }))}
            className="rounded-lg border border-white/10 bg-[#011640] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#618C7C] hover:border-white/20 transition-all" />
        </div>
      </Card>

      {isLoading && (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#618C7C]/20 border-t-[#618C7C]" />
        </div>
      )}
      {isError && <p className="text-center text-red-400">Erro ao carregar documentos.</p>}

      {data?.dados.length === 0 && (
        <Card className="py-12 text-center">
          <p className="text-white/45">Nenhum documento encontrado.</p>
        </Card>
      )}

      {data && data.dados.length > 0 && (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-white/8 bg-white/3">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-white/40">Título</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-white/40">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-white/40">Carga (h)</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-white/40">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-white/40">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.dados.map((doc) => (
                <tr key={doc.id} className="border-b border-white/6 transition-colors hover:bg-white/3">
                  <td className="px-4 py-3 font-medium text-white">{doc.titulo}</td>
                  <td className="px-4 py-3 text-white/55">{doc.tipo}</td>
                  <td className="px-4 py-3 text-white/55">{doc.carga_horaria}h</td>
                  <td className="px-4 py-3"><BadgeStatus status={doc.status} /></td>
                  <td className="px-4 py-3 text-white/40">{new Date(doc.criado_em.replace(' ', 'T')).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/documentos/${doc.id}`} className="text-sm text-[#618C7C] hover:text-[#7AAA9A] transition-colors">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {data && totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" disabled={filtros.page === 1}
            onClick={() => handlePagina((filtros.page ?? 1) - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-white/50">{filtros.page} / {totalPaginas}</span>
          <Button variant="secondary" disabled={filtros.page === totalPaginas}
            onClick={() => handlePagina((filtros.page ?? 1) + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
