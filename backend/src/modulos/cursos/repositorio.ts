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
  dominios_email?: string[] | null;
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

export interface AlunoDoCurso {
  id: string;
  nome: string;
  email: string;
  matricula: string | null;
  ativo: boolean;
  criado_em: Date;
}

export interface CriarCursoInput {
  nome: string;
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
    i.sigla AS instituicao_sigla,
    i.dominios_email
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
      i.dominios_email,
      COUNT(u.id) FILTER (WHERE u.perfil = 'estudante' AND u.ativo = true)::int AS total_estudantes
    FROM cursos c
    JOIN instituicoes i ON i.id = c.instituicao_id
    LEFT JOIN usuarios u ON u.curso_id = c.id
  `;

  if (instituicao_id) {
    const res = await pool.query<CursoComContagem>(
      `${base} WHERE c.instituicao_id = $1 GROUP BY c.id, i.nome, i.sigla, i.dominios_email ORDER BY c.nome ASC`,
      [instituicao_id],
    );
    return res.rows;
  }

  const res = await pool.query<CursoComContagem>(
    `${base} GROUP BY c.id, i.nome, i.sigla, i.dominios_email ORDER BY i.nome ASC, c.nome ASC`,
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

async function gerarCodigo(instituicao_id: string): Promise<string> {
  const instRes = await pool.query<{ sigla: string }>(
    `SELECT sigla FROM instituicoes WHERE id = $1`,
    [instituicao_id],
  );
  const sigla = (instRes.rows[0]?.sigla ?? 'CUR').toUpperCase();

  // Tenta SIGLA001, SIGLA002 ... até encontrar um livre
  for (let n = 1; n <= 9999; n++) {
    const codigo = `${sigla}${String(n).padStart(3, '0')}`;
    const existe = await pool.query(`SELECT id FROM cursos WHERE codigo = $1`, [codigo]);
    if (existe.rows.length === 0) return codigo;
  }
  throw new Error('Não foi possível gerar um código único para o curso');
}

export async function criarCurso(dados: CriarCursoInput): Promise<CursoComDominios> {
  const codigo = await gerarCodigo(dados.instituicao_id);

  const res = await pool.query<{ id: string }>(
    `INSERT INTO cursos (nome, codigo, instituicao_id, carga_horaria_complementar, turno, modalidade)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      dados.nome,
      codigo,
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

// ─── Vínculo coordenador ↔ cursos (relação N:N) ────────────────

// Lista os cursos pelos quais um coordenador é responsável
export async function listarCursosDoCoordenador(coordenadorId: string): Promise<Curso[]> {
  const res = await pool.query<Curso>(
    `${SELECT_CURSO}
     JOIN coordenadores_cursos cc ON cc.curso_id = c.id
     WHERE cc.coordenador_id = $1
     ORDER BY i.nome ASC, c.nome ASC`,
    [coordenadorId],
  );
  return res.rows;
}

// Lista os ids dos cursos pelos quais um coordenador é responsável (usado no JWT)
export async function listarCursoIdsDoCoordenador(coordenadorId: string): Promise<string[]> {
  const res = await pool.query<{ curso_id: string }>(
    `SELECT curso_id FROM coordenadores_cursos WHERE coordenador_id = $1`,
    [coordenadorId],
  );
  return res.rows.map((r) => r.curso_id);
}

// Verifica se um coordenador é responsável por um determinado curso
export async function coordenadorTemCurso(coordenadorId: string, cursoId: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM coordenadores_cursos WHERE coordenador_id = $1 AND curso_id = $2`,
    [coordenadorId, cursoId],
  );
  return (res.rowCount ?? 0) > 0;
}

// Vincula um coordenador a um curso (idempotente)
export async function vincularCoordenadorAoCurso(coordenadorId: string, cursoId: string): Promise<void> {
  await pool.query(
    `INSERT INTO coordenadores_cursos (coordenador_id, curso_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [coordenadorId, cursoId],
  );
}

// Lista os estudantes vinculados a um curso (somente leitura)
export async function listarAlunosDoCurso(cursoId: string): Promise<AlunoDoCurso[]> {
  const res = await pool.query<AlunoDoCurso>(
    `SELECT id, nome, email, matricula, ativo, criado_em
     FROM usuarios
     WHERE curso_id = $1 AND perfil = 'estudante'
     ORDER BY nome ASC`,
    [cursoId],
  );
  return res.rows;
}
