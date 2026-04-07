import registrador from '../../utils/registrador';
import { buscarPorId } from '../../modulos/usuarios/repositorio';
import { notificar } from '../../servicos/notificacao';
import type { EventoDocumentoReprovado } from '../tipos';

/**
 * Ao receber documento_reprovado: notifica o estudante com o motivo da reprovação.
 */
export async function aoDocumentoReprovado(payload: EventoDocumentoReprovado): Promise<void> {
  try {
    const estudante = await buscarPorId(payload.estudanteId);
    if (estudante) {
      await notificar({
        destinatarioId: estudante.id,
        destinatarioEmail: estudante.email,
        destinatarioNome: estudante.nome,
        assunto: 'Seu documento foi reprovado',
        mensagem:
          `Olá, ${estudante.nome}.\n\n` +
          `Seu documento "${payload.titulo}" foi reprovado.\n\n` +
          `Motivo: ${payload.observacoes}`,
      });
    }

    registrador.info(
      `[evento] documento_reprovado | id=${payload.documentoId} | estudante=${payload.estudanteId}`,
    );
  } catch (err) {
    registrador.error(
      `[evento] erro em documento_reprovado | id=${payload.documentoId} | ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
