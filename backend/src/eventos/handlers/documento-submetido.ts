import { pool } from '../../banco/conexao';
import registrador from '../../utils/registrador';
import { notificar } from '../../servicos/notificacao';
import type { EventoDocumentoSubmetido } from '../tipos';

interface CoordenadorRow {
  id: string;
  nome: string;
  email: string;
}

/**
 * Ao receber documento_submetido: notifica todos os coordenadores
 * do curso associado ao documento.
 */
export async function aoDocumentoSubmetido(payload: EventoDocumentoSubmetido): Promise<void> {
  try {
    const res = await pool.query<CoordenadorRow>(
      `SELECT id, nome, email
       FROM usuarios
       WHERE perfil = 'coordenador' AND curso_id = $1 AND ativo = true`,
      [payload.cursoId],
    );

    for (const coordenador of res.rows) {
      await notificar({
        destinatarioId: coordenador.id,
        destinatarioEmail: coordenador.email,
        destinatarioNome: coordenador.nome,
        assunto: 'Novo documento aguardando validação',
        mensagem:
          `Um novo documento foi submetido e aguarda sua análise.\n\n` +
          `Título: ${payload.titulo}\n` +
          `Tipo: ${payload.tipo}\n` +
          `ID: ${payload.documentoId}`,
      });
    }

    registrador.info(
      `[evento] documento_submetido | id=${payload.documentoId} | coordenadores notificados=${res.rows.length}`,
    );
  } catch (err) {
    registrador.error(
      `[evento] erro em documento_submetido | id=${payload.documentoId} | ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
