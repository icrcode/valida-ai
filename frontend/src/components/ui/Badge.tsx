import type { StatusDocumento } from '../../types';

const statusColors: Record<StatusDocumento, string> = {
  pendente:           'bg-amber-500/15 text-amber-300 border border-amber-500/25',
  aprovado:           'bg-[#618C7C]/20 text-[#7AAA9A] border border-[#618C7C]/30',
  reprovado:          'bg-red-500/15 text-red-400 border border-red-500/25',
  cancelado:          'bg-white/5 text-white/40 border border-white/10',
  revisao_solicitada: 'bg-blue-500/15 text-blue-300 border border-blue-500/25',
};

const statusLabel: Record<StatusDocumento, string> = {
  pendente:           'Pendente',
  aprovado:           'Aprovado',
  reprovado:          'Reprovado',
  cancelado:          'Cancelado',
  revisao_solicitada: 'Revisão Solicitada',
};

export function BadgeStatus({ status }: { status: StatusDocumento }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}>
      {statusLabel[status]}
    </span>
  );
}
