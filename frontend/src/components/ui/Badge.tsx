import type { StatusDocumento } from '../../types';

const statusColors: Record<StatusDocumento, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  aprovado: 'bg-green-100 text-green-800',
  reprovado: 'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-600',
  revisao_solicitada: 'bg-blue-100 text-blue-800',
};

const statusLabel: Record<StatusDocumento, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  cancelado: 'Cancelado',
  revisao_solicitada: 'Revisão Solicitada',
};

export function BadgeStatus({ status }: { status: StatusDocumento }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}
