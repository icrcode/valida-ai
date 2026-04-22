import { Router } from 'express';
import { autenticar } from '../../middleware/autenticacao';
import * as repositorio from './repositorio';
import * as repositorioDoc from '../documentos/repositorio';
import { gerarUrlAssinadaCertificado } from '../../servicos/armazenamento';
import { tratarErro } from '../../utils/erros';

const router = Router();

// GET /api/certificados/:id
router.get('/:id', autenticar, async (req, res) => {
  const { id } = req.params as { id: string };

  try {
    const certificado = await repositorio.buscarPorId(id);
    if (!certificado) {
      res.status(404).json({ erro: 'Certificado não encontrado' });
      return;
    }

    // Estudantes só acessam os próprios certificados
    if (
      req.usuario!.perfil === 'estudante' &&
      certificado.estudante_id !== req.usuario!.sub
    ) {
      res.status(403).json({ erro: 'Sem permissão para este certificado' });
      return;
    }

    // Inclui dados do documento para resposta enriquecida
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
    const certificado = await repositorio.buscarPorId(id);
    if (!certificado) {
      res.status(404).json({ erro: 'Certificado não encontrado' });
      return;
    }

    if (
      req.usuario!.perfil === 'estudante' &&
      certificado.estudante_id !== req.usuario!.sub
    ) {
      res.status(403).json({ erro: 'Sem permissão para este certificado' });
      return;
    }

    const url = await gerarUrlAssinadaCertificado(certificado.caminho_arquivo);
    const expiraEm = new Date(Date.now() + 3600 * 1000).toISOString();

    res.json({ url, expira_em: expiraEm });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

export default router;
