export const PERFIL_LABEL: Record<string, string> = {
  estudante: 'Estudante',
  coordenador: 'Coordenador',
  admin: 'Administrador',
};

export const PERFIL_COR: Record<string, string> = {
  estudante: 'bg-[#618C7C]/20 text-[#7AAA9A] border border-[#618C7C]/30',
  coordenador: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  admin: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
};

export function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}
