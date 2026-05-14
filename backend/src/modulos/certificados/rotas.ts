import { Router, type Response } from 'express';
import { autenticar } from '../../middleware/autenticacao';
import * as repositorio from './repositorio';
import * as repositorioDoc from '../documentos/repositorio';
import { gerarUrlAssinadaCertificado } from '../../servicos/armazenamento';
import { tratarErro } from '../../utils/erros';

const router = Router();

type Certificado = NonNullable<Awaited<ReturnType<typeof repositorio.buscarPorId>>>;

async function buscarCertificadoAutorizado(
  id: string,
  usuarioSub: string,
  usuarioPerfil: string,
  res: Response,
): Promise<Certificado | null> {
  const certificado = await repositorio.buscarPorId(id);
  if (!certificado) {
    res.status(404).json({ erro: 'Certificado não encontrado' });
    return null;
  }
  if (usuarioPerfil === 'estudante' && certificado.estudante_id !== usuarioSub) {
    res.status(403).json({ erro: 'Sem permissão para este certificado' });
    return null;
  }
  return certificado;
}

// GET /api/certificados — lista certificados do estudante autenticado
router.get('/', autenticar, async (req, res) => {
  try {
    const certificados = await repositorio.buscarPorEstudante(req.usuario!.sub);
    const comDocumentos = await Promise.all(
      certificados.map(async (cert) => {
        const documento = await repositorioDoc.buscarPorId(cert.documento_id);
        return { ...cert, documento };
      }),
    );
    res.json(comDocumentos);
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/certificados/:id
router.get('/:id', autenticar, async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const certificado = await buscarCertificadoAutorizado(
      id, req.usuario!.sub, req.usuario!.perfil, res,
    );
    if (!certificado) return;

    const documento = await repositorioDoc.buscarPorId(certificado.documento_id);
    res.json({ ...certificado, documento });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/certificados/:id/download
router.get('/:id/download', autenticar, async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const certificado = await buscarCertificadoAutorizado(
      id, req.usuario!.sub, req.usuario!.perfil, res,
    );
    if (!certificado) return;

    const url = await gerarUrlAssinadaCertificado(certificado.caminho_arquivo);
    const expiraEm = new Date(Date.now() + 3600 * 1000).toISOString();
    res.json({ url, expira_em: expiraEm });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

export default router;
