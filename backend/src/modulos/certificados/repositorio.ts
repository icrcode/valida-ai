import { pool } from '../../banco/conexao';

export interface Certificado {
  id: string;
  documento_id: string;
  estudante_id: string;
  hash: string;
  caminho_arquivo: string;
  criado_em: Date;
}

export async function criar(dados: {
  documento_id: string;
  estudante_id: string;
  hash: string;
  caminho_arquivo: string;
}): Promise<Certificado> {
  const res = await pool.query(
    `INSERT INTO certificados (documento_id, estudante_id, hash, caminho_arquivo)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [dados.documento_id, dados.estudante_id, dados.hash, dados.caminho_arquivo],
  );
  return res.rows[0] as Certificado;
}

export async function buscarPorId(id: string): Promise<Certificado | null> {
  const res = await pool.query('SELECT * FROM certificados WHERE id = $1', [id]);
  return (res.rows[0] as Certificado) || null;
}

export async function buscarPorHash(hash: string): Promise<Certificado | null> {
  const res = await pool.query('SELECT * FROM certificados WHERE hash = $1', [hash]);
  return (res.rows[0] as Certificado) || null;
}

export async function buscarPorDocumento(documentoId: string): Promise<Certificado | null> {
  const res = await pool.query(
    'SELECT * FROM certificados WHERE documento_id = $1',
    [documentoId],
  );
  return (res.rows[0] as Certificado) || null;
}
