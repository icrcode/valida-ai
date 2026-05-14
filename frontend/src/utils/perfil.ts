export const PERFIL_LABEL: Record<string, string> = {
  estudante: 'Estudante',
  coordenador: 'Coordenador',
  admin: 'Administrador',
};

export const PERFIL_COR: Record<string, string> = {
  estudante: 'bg-blue-100 text-blue-700',
  coordenador: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
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
