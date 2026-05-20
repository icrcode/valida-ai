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
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface CursoComContagem extends Curso {
  total_estudantes: number;
}

export interface CriarCursoInput {
  nome: string;
  codigo: string;
  instituicao_id: string;
  carga_horaria_complementar?: number;
  turno?: string;
  modalidade?: string;
}

export type AtualizarCursoInput = Partial<Omit<CriarCursoInput, 'codigo'>>;

export const cursosService = {
  // Lista apenas ativos — usado no cadastro de estudantes
  listar: (): Promise<Curso[]> =>
    api.get<Curso[]>('/api/cursos').then((r) => r.data),

  // Lista todos (admin) com contagem de alunos, opcionalmente filtrado por instituição
  listarAdmin: (instituicao_id?: string): Promise<CursoComContagem[]> =>
    api
      .get<CursoComContagem[]>('/api/cursos/admin', {
        params: instituicao_id ? { instituicao_id } : undefined,
      })
      .then((r) => r.data),

  criar: (dados: CriarCursoInput): Promise<Curso> =>
    api.post<Curso>('/api/cursos', dados).then((r) => r.data),

  atualizar: (id: string, dados: AtualizarCursoInput): Promise<Curso> =>
    api.put<Curso>(`/api/cursos/${id}`, dados).then((r) => r.data),

  alterarAtivo: (id: string, ativo: boolean): Promise<Curso> =>
    api.patch<Curso>(`/api/cursos/${id}/ativo`, { ativo }).then((r) => r.data),
};
