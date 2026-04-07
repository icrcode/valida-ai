import registrador from '../../utils/registrador';
import { buscarPorId } from '../../modulos/usuarios/repositorio';
import { notificar } from '../../servicos/notificacao';
import type { EventoDocumentoRevisaoSolicitada } from '../tipos';

/**
 * Ao receber documento_revisao_solicitada: notifica o estudante
 * com as observações do coordenador.
 */
export async function aoDocumentoRevisaoSolicitada(
  payload: EventoDocumentoRevisaoSolicitada,
): Promise<void> {
  try {
    const estudante = await buscarPorId(payload.estudanteId);
    if (estudante) {
      await notificar({
        destinatarioId: estudante.id,
        destinatarioEmail: estudante.email,
        destinatarioNome: estudante.nome,
        assunto: 'Revisão solicitada para seu documento',
        mensagem:
          `Olá, ${estudante.nome}.\n\n` +
          `Seu documento "${payload.titulo}" precisa de revisão antes de ser aprovado.\n\n` +
          `Observações do coordenador: ${payload.observacoes}`,
      });
    }

    registrador.info(
      `[evento] documento_revisao_solicitada | id=${payload.documentoId} | estudante=${payload.estudanteId}`,
    );
  } catch (err) {
    registrador.error(
      `[evento] erro em documento_revisao_solicitada | id=${payload.documentoId} | ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
