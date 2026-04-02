import { pool } from '../../banco/conexao';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  matricula: string | null;
  perfil: 'estudante' | 'coordenador' | 'admin';
  curso_id: string | null;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

const CAMPOS =
  'id, nome, email, matricula, perfil, curso_id, ativo, criado_em, atualizado_em';

export async function buscarPorId(id: string): Promise<Usuario | null> {
  const res = await pool.query(`SELECT ${CAMPOS} FROM usuarios WHERE id = $1`, [id]);
  return (res.rows[0] as Usuario) || null;
}

export async function buscarPorEmail(email: string): Promise<Usuario | null> {
  const res = await pool.query(`SELECT ${CAMPOS} FROM usuarios WHERE email = $1`, [email]);
  return (res.rows[0] as Usuario) || null;
}

export async function listarTodos(): Promise<Usuario[]> {
  const res = await pool.query(`SELECT ${CAMPOS} FROM usuarios ORDER BY nome ASC`);
  return res.rows as Usuario[];
}

export async function atualizarNome(id: string, nome: string): Promise<Usuario | null> {
  const res = await pool.query(
    `UPDATE usuarios SET nome = $1 WHERE id = $2 RETURNING ${CAMPOS}`,
    [nome, id],
  );
  return (res.rows[0] as Usuario) || null;
}
