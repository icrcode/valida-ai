import { Router } from 'express';
import * as repositorioCert from '../modulos/certificados/repositorio';
import * as repositorioDoc from '../modulos/documentos/repositorio';
import * as repositorioUsr from '../modulos/usuarios/repositorio';
import { tratarErro } from '../utils/erros';
import { historicoDocumento } from '../blockchain/servico';

const router = Router();

// GET /api/publica/verificar/:hash — verificação pública de certificados (sem autenticação)
router.get('/verificar/:hash', async (req, res) => {
  const { hash } = req.params as { hash: string };

  try {
    const certificado = await repositorioCert.buscarPorHash(hash);
    if (!certificado) {
      res.status(404).json({ valido: false, erro: 'Certificado não encontrado' });
      return;
    }

    const [documento, estudante, historicoCadeia] = await Promise.all([
      repositorioDoc.buscarPorId(certificado.documento_id),
      repositorioUsr.buscarPorId(certificado.estudante_id),
      // A verificação continua funcionando mesmo se a blockchain estiver indisponível
      historicoDocumento(certificado.documento_id).catch(() => null),
    ]);

    const ancoragem = historicoCadeia?.find(
      (p) =>
        p.transacao.tipo === 'CERTIFICADO_EMITIDO' &&
        p.transacao.dados.codigoVerificacao === certificado.hash,
    );

    res.json({
      valido: true,
      certificado: {
        id: certificado.id,
        hash: certificado.hash,
        emitido_em: certificado.criado_em,
      },
      documento: documento
        ? {
            titulo: documento.titulo,
            tipo: documento.tipo,
            carga_horaria: documento.carga_horaria,
            status: documento.status,
          }
        : null,
      estudante: estudante
        ? {
            nome: estudante.nome,
            email: estudante.email,
          }
        : null,
      blockchain:
        historicoCadeia === null
          ? { disponivel: false }
          : {
              disponivel: true,
              ancorado: !!ancoragem && ancoragem.provaValida,
              certificado: ancoragem ?? null,
              linhaDoTempo: historicoCadeia.map((p) => ({
                tipo: p.transacao.tipo,
                timestamp: p.transacao.timestamp,
                transacaoId: p.transacao.id,
                bloco: p.bloco.altura,
                hashBloco: p.bloco.hash,
                provaValida: p.provaValida,
              })),
            },
    });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

export default router;
