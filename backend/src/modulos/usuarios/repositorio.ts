import { pool } from '../../banco/conexao';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  matricula: string | null;
  perfil: 'estudante' | 'coordenador' | 'admin';
  curso_id: string | null;
  instituicao_id: string | null;
  instituicao_nome: string | null;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface UsuarioParaLogin extends Usuario {
  dominios_email: string[] | null;
}

// Relação: usuarios → cursos → instituicoes
const SELECT_USUARIO = `
  SELECT
    u.id,
    u.nome,
    u.email,
    u.matricula,
    u.perfil,
    u.curso_id,
    c.instituicao_id,
    i.nome    AS instituicao_nome,
    u.ativo,
    u.criado_em,
    u.atualizado_em
  FROM usuarios u
  LEFT JOIN cursos c       ON c.id = u.curso_id       AND c.ativo = true
  LEFT JOIN instituicoes i ON i.id = c.instituicao_id AND i.ativa = true
`;

export async function buscarPorId(id: string): Promise<Usuario | null> {
  const res = await pool.query<Usuario>(`${SELECT_USUARIO} WHERE u.id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function buscarPorEmailParaLogin(email: string): Promise<UsuarioParaLogin | null> {
  const res = await pool.query<UsuarioParaLogin>(
    `SELECT
       u.id, u.nome, u.email, u.matricula, u.perfil, u.curso_id,
       u.ativo, u.criado_em, u.atualizado_em,
       c.instituicao_id,
       i.nome          AS instituicao_nome,
       i.dominios_email
     FROM usuarios u
     LEFT JOIN cursos c       ON c.id = u.curso_id       AND c.ativo = true
     LEFT JOIN instituicoes i ON i.id = c.instituicao_id AND i.ativa = true
     WHERE LOWER(u.email) = LOWER($1) AND u.ativo = true`,
    [email],
  );
  return res.rows[0] ?? null;
}

export async function listarTodos(instituicao_id?: string): Promise<Usuario[]> {
  if (instituicao_id) {
    const res = await pool.query<Usuario>(
      `${SELECT_USUARIO} WHERE c.instituicao_id = $1 ORDER BY u.nome ASC`,
      [instituicao_id],
    );
    return res.rows;
  }
  const res = await pool.query<Usuario>(`${SELECT_USUARIO} ORDER BY u.nome ASC`);
  return res.rows;
}

export async function atualizarNome(id: string, nome: string): Promise<Usuario | null> {
  await pool.query(
    `UPDATE usuarios SET nome = $1, atualizado_em = NOW() WHERE id = $2`,
    [nome, id],
  );
  return buscarPorId(id);
}
