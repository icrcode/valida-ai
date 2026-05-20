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
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface CursoComContagem extends Curso {
  total_estudantes: number;
}

export interface CursoComDominios extends Curso {
  dominios_email: string[] | null;
}

export interface CriarCursoInput {
  nome: string;
  codigo: string;
  instituicao_id: string;
  carga_horaria_complementar?: number;
  turno?: string | null;
  modalidade?: string | null;
}

export type AtualizarCursoInput = Partial<Omit<CriarCursoInput, 'codigo'>>;

const SELECT_CURSO = `
  SELECT
    c.id, c.nome, c.codigo, c.carga_horaria_complementar,
    c.turno, c.modalidade, c.ativo, c.criado_em, c.atualizado_em,
    c.instituicao_id,
    i.nome  AS instituicao_nome,
    i.sigla AS instituicao_sigla
  FROM cursos c
  JOIN instituicoes i ON i.id = c.instituicao_id
`;

export async function listarCursos(instituicao_id?: string): Promise<CursoComContagem[]> {
  const base = `
    SELECT
      c.id, c.nome, c.codigo, c.carga_horaria_complementar,
      c.turno, c.modalidade, c.ativo, c.criado_em, c.atualizado_em,
      c.instituicao_id,
      i.nome  AS instituicao_nome,
      i.sigla AS instituicao_sigla,
      COUNT(u.id) FILTER (WHERE u.perfil = 'estudante' AND u.ativo = true)::int AS total_estudantes
    FROM cursos c
    JOIN instituicoes i ON i.id = c.instituicao_id
    LEFT JOIN usuarios u ON u.curso_id = c.id
  `;

  if (instituicao_id) {
    const res = await pool.query<CursoComContagem>(
      `${base} WHERE c.instituicao_id = $1 GROUP BY c.id, i.nome, i.sigla ORDER BY c.nome ASC`,
      [instituicao_id],
    );
    return res.rows;
  }

  const res = await pool.query<CursoComContagem>(
    `${base} GROUP BY c.id, i.nome, i.sigla ORDER BY i.nome ASC, c.nome ASC`,
  );
  return res.rows;
}

export async function listarCursosAtivos(): Promise<Curso[]> {
  const res = await pool.query<Curso>(
    `${SELECT_CURSO} WHERE c.ativo = true AND i.ativa = true ORDER BY i.nome ASC, c.nome ASC`,
  );
  return res.rows;
}

export async function buscarCursoPorId(id: string): Promise<CursoComDominios | null> {
  const res = await pool.query<CursoComDominios>(
    `SELECT
       c.id, c.nome, c.codigo, c.carga_horaria_complementar,
       c.turno, c.modalidade, c.ativo, c.criado_em, c.atualizado_em,
       c.instituicao_id,
       i.nome           AS instituicao_nome,
       i.sigla          AS instituicao_sigla,
       i.dominios_email
     FROM cursos c
     JOIN instituicoes i ON i.id = c.instituicao_id
     WHERE c.id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function buscarCursoPorCodigo(codigo: string): Promise<Curso | null> {
  const res = await pool.query<Curso>(
    `${SELECT_CURSO} WHERE UPPER(c.codigo) = UPPER($1)`,
    [codigo],
  );
  return res.rows[0] ?? null;
}

export async function criarCurso(dados: CriarCursoInput): Promise<CursoComDominios> {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO cursos (nome, codigo, instituicao_id, carga_horaria_complementar, turno, modalidade)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      dados.nome,
      dados.codigo.toUpperCase(),
      dados.instituicao_id,
      dados.carga_horaria_complementar ?? 200,
      dados.turno ?? null,
      dados.modalidade ?? null,
    ],
  );
  const curso = await buscarCursoPorId(res.rows[0].id);
  if (!curso) throw new Error('Falha ao recuperar curso após criação');
  return curso;
}

export async function atualizarCurso(
  id: string,
  dados: AtualizarCursoInput,
): Promise<CursoComDominios | null> {
  const campos: string[] = [];
  const valores: unknown[] = [];
  let idx = 1;

  if (dados.nome !== undefined)                       { campos.push(`nome = $${idx++}`);                       valores.push(dados.nome); }
  if (dados.instituicao_id !== undefined)             { campos.push(`instituicao_id = $${idx++}`);             valores.push(dados.instituicao_id); }
  if (dados.carga_horaria_complementar !== undefined) { campos.push(`carga_horaria_complementar = $${idx++}`); valores.push(dados.carga_horaria_complementar); }
  if (dados.turno !== undefined)                      { campos.push(`turno = $${idx++}`);                      valores.push(dados.turno); }
  if (dados.modalidade !== undefined)                 { campos.push(`modalidade = $${idx++}`);                 valores.push(dados.modalidade); }

  if (campos.length === 0) return buscarCursoPorId(id);

  campos.push(`atualizado_em = NOW()`);
  valores.push(id);

  await pool.query(
    `UPDATE cursos SET ${campos.join(', ')} WHERE id = $${idx}`,
    valores,
  );
  return buscarCursoPorId(id);
}

export async function alterarAtivo(id: string, ativo: boolean): Promise<CursoComDominios | null> {
  await pool.query(
    `UPDATE cursos SET ativo = $1, atualizado_em = NOW() WHERE id = $2`,
    [ativo, id],
  );
  return buscarCursoPorId(id);
}
