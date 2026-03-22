import { pool } from '../../banco/conexao';

export interface HistoricoValidacao {
  id: string;
  documento_id: string;
  usuario_id: string;
  status_anterior: string;
  status_novo: string;
  observacoes: string | null;
  metadados: object | null;
  ocorrido_em: Date;
}

export type AcaoValidacao = 'aprovar' | 'reprovar' | 'solicitar-revisao';

const mapaStatus: Record<AcaoValidacao, string> = {
  aprovar: 'aprovado',
  reprovar: 'reprovado',
  'solicitar-revisao': 'revisao_solicitada',
};

export async function executarAcao(
  documentoId: string,
  coordenadorId: string,
  acao: AcaoValidacao,
  observacoes?: string,
): Promise<{ documento: Record<string, unknown>; historico: HistoricoValidacao }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const docRes = await client.query(
      `SELECT * FROM documentos WHERE id = $1 AND status <> 'cancelado' FOR UPDATE`,
      [documentoId],
    );

    if (docRes.rows.length === 0) {
      throw new Error('Documento não encontrado ou cancelado');
    }

    const statusAnterior = docRes.rows[0].status as string;
    const statusNovo = mapaStatus[acao];

    const docAtualizado = await client.query(
      `UPDATE documentos SET status = $1, coordenador_id = $2 WHERE id = $3 RETURNING *`,
      [statusNovo, coordenadorId, documentoId],
    );

    const historicoRes = await client.query(
      `INSERT INTO historico_validacoes
         (documento_id, usuario_id, status_anterior, status_novo, observacoes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [documentoId, coordenadorId, statusAnterior, statusNovo, observacoes ?? null],
    );

    await client.query('COMMIT');

    return {
      documento: docAtualizado.rows[0] as Record<string, unknown>,
      historico: historicoRes.rows[0] as HistoricoValidacao,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function buscarHistoricoPorDocumento(
  documentoId: string,
): Promise<HistoricoValidacao[]> {
  const res = await pool.query(
    `SELECT hv.*, u.nome AS usuario_nome, u.perfil AS usuario_perfil
     FROM historico_validacoes hv
     JOIN usuarios u ON u.id = hv.usuario_id
     WHERE hv.documento_id = $1
     ORDER BY hv.ocorrido_em ASC`,
    [documentoId],
  );
  return res.rows as HistoricoValidacao[];
}
