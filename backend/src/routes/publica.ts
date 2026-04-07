import { Router } from 'express';
import * as repositorioCert from '../modulos/certificados/repositorio';
import * as repositorioDoc from '../modulos/documentos/repositorio';
import * as repositorioUsr from '../modulos/usuarios/repositorio';
import { tratarErro } from '../utils/erros';

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

    const [documento, estudante] = await Promise.all([
      repositorioDoc.buscarPorId(certificado.documento_id),
      repositorioUsr.buscarPorId(certificado.estudante_id),
    ]);

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
    });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

export default router;
