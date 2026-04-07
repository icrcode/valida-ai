import registrador from '../../utils/registrador';
import { buscarPorId } from '../../modulos/usuarios/repositorio';
import { notificar } from '../../servicos/notificacao';
import type { EventoDocumentoAprovado } from '../tipos';

/**
 * Ao receber documento_aprovado:
 *  1. Notifica o estudante dono do documento.
 *  2. Dispara a geração do certificado (stub — implementar no módulo 2.5).
 */
export async function aoDocumentoAprovado(payload: EventoDocumentoAprovado): Promise<void> {
  try {
    const estudante = await buscarPorId(payload.estudanteId);
    if (estudante) {
      await notificar({
        destinatarioId: estudante.id,
        destinatarioEmail: estudante.email,
        destinatarioNome: estudante.nome,
        assunto: 'Seu documento foi aprovado!',
        mensagem:
          `Parabéns, ${estudante.nome}!\n\n` +
          `Seu documento "${payload.titulo}" foi aprovado.\n` +
          `Em breve seu certificado estará disponível para download.`,
      });
    }

    // TODO: disparar geração de certificado quando o módulo 2.5 for implementado.
    // Exemplo: await gerarCertificado(payload.documentoId, payload.estudanteId);

    registrador.info(
      `[evento] documento_aprovado | id=${payload.documentoId} | estudante=${payload.estudanteId}`,
    );
  } catch (err) {
    registrador.error(
      `[evento] erro em documento_aprovado | id=${payload.documentoId} | ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
