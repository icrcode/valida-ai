import api from './api';

export interface Curso {
  id: string;
  nome: string;
  codigo: string;
  carga_horaria_complementar: number;
  turno: string | null;
  modalidade: string | null;
  instituicao_id: string;
  instituicao_nome: string;
  instituicao_sigla: string;
}

export const cursosService = {
  listar: (): Promise<Curso[]> => api.get<Curso[]>('/api/cursos').then((r) => r.data),
};
