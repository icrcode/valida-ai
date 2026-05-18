import { pool } from '../../banco/conexao';

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

export interface CursoComDominios extends Curso {
  dominios_email: string[] | null;
}

const SELECT_CURSO = `
  SELECT
    c.id,
    c.nome,
    c.codigo,
    c.carga_horaria_complementar,
    c.turno,
    c.modalidade,
    c.instituicao_id,
    i.nome  AS instituicao_nome,
    i.sigla AS instituicao_sigla
  FROM cursos c
  JOIN instituicoes i ON i.id = c.instituicao_id AND i.ativa = true
  WHERE c.ativo = true
`;

export async function listarCursos(): Promise<Curso[]> {
  const res = await pool.query<Curso>(`${SELECT_CURSO} ORDER BY i.nome ASC, c.nome ASC`);
  return res.rows;
}

export async function buscarCursoPorId(id: string): Promise<CursoComDominios | null> {
  const res = await pool.query<CursoComDominios>(
    `SELECT
       c.id, c.nome, c.codigo, c.carga_horaria_complementar, c.turno, c.modalidade,
       c.instituicao_id,
       i.nome           AS instituicao_nome,
       i.sigla          AS instituicao_sigla,
       i.dominios_email
     FROM cursos c
     JOIN instituicoes i ON i.id = c.instituicao_id AND i.ativa = true
     WHERE c.id = $1 AND c.ativo = true`,
    [id],
  );
  return res.rows[0] ?? null;
}
