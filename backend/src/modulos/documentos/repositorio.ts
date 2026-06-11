import { pool } from '../../banco/conexao';

export interface Documento {
  id: string;
  titulo: string;
  tipo: string;
  carga_horaria: number;
  estudante_id: string;
  curso_id: string;
  status: string;
  coordenador_id: string | null;
  nome_arquivo: string;
  caminho_arquivo: string;
  tamanho_arquivo: number;
  mime_type: string;
  criado_em: Date;
  atualizado_em: Date;
}

export interface FiltrosDocumento {
  status?: string;
  tipo?: string;
  estudante_id?: string;
  curso_id?: string;
  page?: number;
  limite?: number;
}

export async function criar(dados: {
  titulo: string;
  tipo: string;
  carga_horaria: number;
  estudante_id: string;
  curso_id: string;
  nome_arquivo: string;
  caminho_arquivo: string;
  tamanho_arquivo: number;
  mime_type: string;
}): Promise<Documento> {
  const res = await pool.query(
    `INSERT INTO documentos
       (titulo, tipo, carga_horaria, estudante_id, curso_id, status,
        nome_arquivo, caminho_arquivo, tamanho_arquivo, mime_type)
     VALUES ($1, $2, $3, $4, $5, 'pendente', $6, $7, $8, $9)
     RETURNING *`,
    [
      dados.titulo,
      dados.tipo,
      dados.carga_horaria,
      dados.estudante_id,
      dados.curso_id,
      dados.nome_arquivo,
      dados.caminho_arquivo,
      dados.tamanho_arquivo,
      dados.mime_type,
    ],
  );
  return res.rows[0] as Documento;
}

export async function buscarPorId(id: string): Promise<Documento | null> {
  const res = await pool.query('SELECT * FROM documentos WHERE id = $1', [id]);
  return (res.rows[0] as Documento) || null;
}

export async function listar(
  filtros: FiltrosDocumento,
  usuarioId: string,
  perfil: string,
  cursoIds?: string[] | null,
): Promise<{ dados: Documento[]; total: number }> {
  const pagina = filtros.page || 1;
  const limite = Math.min(filtros.limite || 10, 100);
  const offset = (pagina - 1) * limite;

  const params: unknown[] = [];
  const condicoes: string[] = [];

  if (perfil === 'estudante') {
    // Estudante só vê os próprios documentos
    params.push(usuarioId);
    condicoes.push(`estudante_id = $${params.length}`);
  } else if (perfil === 'coordenador') {
    // Coordenador só vê documentos dos cursos pelos quais é responsável
    if (!cursoIds || cursoIds.length === 0) {
      return { dados: [], total: 0 };
    }
    if (filtros.curso_id) {
      if (!cursoIds.includes(filtros.curso_id)) {
        return { dados: [], total: 0 };
      }
      params.push(filtros.curso_id);
      condicoes.push(`curso_id = $${params.length}`);
    } else {
      params.push(cursoIds);
      condicoes.push(`curso_id = ANY($${params.length}::uuid[])`);
    }
    // Admin pode passar estudante_id como filtro adicional; coordenador não
    if (filtros.estudante_id) {
      params.push(filtros.estudante_id);
      condicoes.push(`estudante_id = $${params.length}`);
    }
  } else {
    // Admin: sem restrição, mas pode filtrar por curso_id e/ou estudante_id
    if (filtros.curso_id) {
      params.push(filtros.curso_id);
      condicoes.push(`curso_id = $${params.length}`);
    }
    if (filtros.estudante_id) {
      params.push(filtros.estudante_id);
      condicoes.push(`estudante_id = $${params.length}`);
    }
  }

  if (filtros.status) {
    params.push(filtros.status);
    condicoes.push(`status = $${params.length}`);
  }

  if (filtros.tipo) {
    params.push(filtros.tipo);
    condicoes.push(`tipo = $${params.length}`);
  }

  const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  const contagemRes = await pool.query(
    `SELECT COUNT(*) FROM documentos ${where}`,
    params,
  );
  const total = Number.parseInt(contagemRes.rows[0].count as string, 10);

  params.push(limite, offset);
  const dadosRes = await pool.query(
    `SELECT * FROM documentos ${where}
     ORDER BY criado_em DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return { dados: dadosRes.rows as Documento[], total };
}

export async function cancelar(id: string, estudanteId: string): Promise<Documento | null> {
  const res = await pool.query(
    `UPDATE documentos SET status = 'cancelado'
     WHERE id = $1 AND estudante_id = $2 AND status = 'pendente'
     RETURNING *`,
    [id, estudanteId],
  );
  return (res.rows[0] as Documento) || null;
}
