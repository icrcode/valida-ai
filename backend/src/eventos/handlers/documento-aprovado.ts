import registrador from '../../utils/registrador';
import { buscarPorId as buscarUsuario } from '../../modulos/usuarios/repositorio';
import { buscarPorId as buscarDocumento } from '../../modulos/documentos/repositorio';
import { notificar } from '../../servicos/notificacao';
import { gerarEArmazenarCertificado } from '../../servicos/gerador-certificado';
import * as repositorioCert from '../../modulos/certificados/repositorio';
import type { EventoDocumentoAprovado } from '../tipos';

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';

export async function aoDocumentoAprovado(payload: EventoDocumentoAprovado): Promise<void> {
  try {
    const [estudante, documento, coordenador] = await Promise.all([
      buscarUsuario(payload.estudanteId),
      buscarDocumento(payload.documentoId),
      buscarUsuario(payload.coordenadorId),
    ]);

    if (!estudante || !documento) {
      registrador.warn(
        `[evento] documento_aprovado | estudante ou documento não encontrado | id=${payload.documentoId}`,
      );
      return;
    }

    const coordenadorNome = coordenador?.nome ?? 'Coordenador';

    // Gerar e armazenar certificado PDF
    const { hash, caminhoArquivo } = await gerarEArmazenarCertificado(
      {
        documentoId: documento.id,
        estudanteNome: estudante.nome,
        estudanteEmail: estudante.email,
        coordenadorNome,
        titulo: documento.titulo,
        tipo: documento.tipo,
        cargaHoraria: documento.carga_horaria,
        dataAprovacao: new Date(),
      },
      FRONTEND_URL,
    );

    // Persistir certificado no banco
    await repositorioCert.criar({
      documento_id: documento.id,
      estudante_id: estudante.id,
      hash,
      caminho_arquivo: caminhoArquivo,
    });

    const urlVerificacao = `${FRONTEND_URL.replace(/\/+$/, '')}/verificar/${hash}`;

    // Notificar estudante
    await notificar({
      destinatarioId: estudante.id,
      destinatarioEmail: estudante.email,
      destinatarioNome: estudante.nome,
      assunto: 'Seu documento foi aprovado!',
      mensagem:
        `Parabéns, ${estudante.nome}!\n\n` +
        `Seu documento "${documento.titulo}" foi aprovado e seu certificado está disponível.\n\n` +
        `Verifique a autenticidade em: ${urlVerificacao}`,
    });

    registrador.info(
      `[evento] documento_aprovado | id=${payload.documentoId} | estudante=${payload.estudanteId} | hash=${hash.slice(0, 12)}...`,
    );
  } catch (err) {
    registrador.error(
      `[evento] erro em documento_aprovado | id=${payload.documentoId} | ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
