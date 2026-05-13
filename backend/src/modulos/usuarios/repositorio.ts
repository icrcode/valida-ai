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

// Campos do usuário + join com instituição (LEFT JOIN para ser compatível antes da migration)
const SELECT_USUARIO = `
  SELECT
    u.id,
    u.nome,
    u.email,
    u.matricula,
    u.perfil,
    u.curso_id,
    u.instituicao_id,
    i.nome    AS instituicao_nome,
    u.ativo,
    u.criado_em,
    u.atualizado_em
  FROM usuarios u
  LEFT JOIN instituicoes i ON i.id = u.instituicao_id AND i.ativo = true
`;

export async function buscarPorId(id: string): Promise<Usuario | null> {
  const res = await pool.query<Usuario>(
    `${SELECT_USUARIO} WHERE u.id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function buscarPorEmail(email: string): Promise<Usuario | null> {
  const res = await pool.query<Usuario>(
    `${SELECT_USUARIO} WHERE LOWER(u.email) = LOWER($1)`,
    [email],
  );
  return res.rows[0] ?? null;
}

export async function listarTodos(instituicao_id?: string): Promise<Usuario[]> {
  if (instituicao_id) {
    const res = await pool.query<Usuario>(
      `${SELECT_USUARIO} WHERE u.instituicao_id = $1 ORDER BY u.nome ASC`,
      [instituicao_id],
    );
    return res.rows;
  }
  const res = await pool.query<Usuario>(`${SELECT_USUARIO} ORDER BY u.nome ASC`);
  return res.rows;
}

export async function atualizarNome(id: string, nome: string): Promise<Usuario | null> {
  // Atualiza o nome e depois busca com o join para retornar dados completos
  await pool.query(
    `UPDATE usuarios SET nome = $1, atualizado_em = NOW() WHERE id = $2`,
    [nome, id],
  );
  return buscarPorId(id);
}
