import { pool } from '../../banco/conexao';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  matricula: string | null;
  cpf: string | null;
  endereco: string | null;
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
  senha_hash: string;
}

// Relação: usuarios → cursos → instituicoes
const SELECT_USUARIO = `
  SELECT
    u.id,
    u.nome,
    u.email,
    u.matricula,
    u.cpf,
    u.endereco,
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
       u.senha_hash,
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

export async function buscarPorEmail(email: string): Promise<Usuario | null> {
  const res = await pool.query<Usuario>(
    `${SELECT_USUARIO} WHERE LOWER(u.email) = LOWER($1)`,
    [email],
  );
  return res.rows[0] ?? null;
}

export interface CriarUsuarioInput {
  nome: string;
  email: string;
  senha_hash: string;
  perfil: 'estudante' | 'coordenador' | 'admin';
  matricula?: string | null;
  curso_id?: string | null;
}

export async function criarUsuario(dados: CriarUsuarioInput): Promise<Usuario> {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO usuarios (nome, email, senha_hash, perfil, matricula, curso_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [dados.nome, dados.email, dados.senha_hash, dados.perfil, dados.matricula ?? null, dados.curso_id ?? null],
  );
  const usuario = await buscarPorId(res.rows[0].id);
  if (!usuario) throw new Error('Falha ao recuperar usuário após criação');
  return usuario;
}

export interface AtualizarUsuarioInput {
  nome?: string;
  email?: string;
  matricula?: string | null;
  cpf?: string | null;
  endereco?: string | null;
  curso_id?: string | null;
  perfil?: 'estudante' | 'coordenador' | 'admin';
}

export interface AtualizarPerfilInput {
  nome?: string;
  email?: string;
  matricula?: string | null;
  cpf?: string | null;
  endereco?: string | null;
  senha_hash?: string;
}

export async function atualizarUsuario(
  id: string,
  dados: AtualizarUsuarioInput,
): Promise<Usuario | null> {
  const campos: string[] = [];
  const valores: unknown[] = [];
  let idx = 1;

  if (dados.nome !== undefined)      { campos.push(`nome = $${idx++}`);       valores.push(dados.nome); }
  if (dados.email !== undefined)     { campos.push(`email = $${idx++}`);      valores.push(dados.email); }
  if (dados.matricula !== undefined) { campos.push(`matricula = $${idx++}`);  valores.push(dados.matricula); }
  if (dados.cpf !== undefined)       { campos.push(`cpf = $${idx++}`);        valores.push(dados.cpf); }
  if (dados.endereco !== undefined)  { campos.push(`endereco = $${idx++}`);   valores.push(dados.endereco); }
  if (dados.curso_id !== undefined)  { campos.push(`curso_id = $${idx++}`);   valores.push(dados.curso_id); }
  if (dados.perfil !== undefined)    { campos.push(`perfil = $${idx++}`);     valores.push(dados.perfil); }

  if (campos.length === 0) return buscarPorId(id);

  campos.push(`atualizado_em = NOW()`);
  valores.push(id);

  await pool.query(
    `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${idx}`,
    valores,
  );
  return buscarPorId(id);
}

export async function atualizarPerfil(
  id: string,
  dados: AtualizarPerfilInput,
): Promise<Usuario | null> {
  const campos: string[] = [];
  const valores: unknown[] = [];
  let idx = 1;

  if (dados.nome !== undefined)       { campos.push(`nome = $${idx++}`);       valores.push(dados.nome); }
  if (dados.email !== undefined)      { campos.push(`email = $${idx++}`);      valores.push(dados.email); }
  if (dados.matricula !== undefined)  { campos.push(`matricula = $${idx++}`);  valores.push(dados.matricula); }
  if (dados.cpf !== undefined)        { campos.push(`cpf = $${idx++}`);        valores.push(dados.cpf); }
  if (dados.endereco !== undefined)   { campos.push(`endereco = $${idx++}`);   valores.push(dados.endereco); }
  if (dados.senha_hash !== undefined) { campos.push(`senha_hash = $${idx++}`); valores.push(dados.senha_hash); }

  if (campos.length === 0) return buscarPorId(id);

  campos.push(`atualizado_em = NOW()`);
  valores.push(id);

  await pool.query(
    `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${idx}`,
    valores,
  );
  return buscarPorId(id);
}

export async function alterarAtivo(id: string, ativo: boolean): Promise<Usuario | null> {
  await pool.query(
    `UPDATE usuarios SET ativo = $1, atualizado_em = NOW() WHERE id = $2`,
    [ativo, id],
  );
  return buscarPorId(id);
}
