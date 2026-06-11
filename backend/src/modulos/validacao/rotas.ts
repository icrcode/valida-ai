import { Router } from 'express';
import { autenticar } from '../../middleware/autenticacao';
import { exigirPerfil } from '../../middleware/autorizacao';
import { buscarPorId as buscarDocumento } from '../documentos/repositorio';
import * as repositorio from './repositorio';
import { tratarErro, tratarErroComNaoEncontrado, verificarAcessoDocumento } from '../../utils/erros';
import { barramento } from '../../eventos/barramento';

const router = Router();

// PATCH /api/documentos/:id/aprovar
router.patch('/:id/aprovar', autenticar, exigirPerfil('coordenador', 'admin'), async (req, res) => {
  const { id } = req.params as { id: string };
  const { observacoes } = req.body as { observacoes?: string };

  try {
    const documento = await buscarDocumento(id);
    if (!verificarAcessoDocumento(res, documento, req.usuario!.perfil, req.usuario!.sub, req.usuario!.curso_ids)) return;

    const resultado = await repositorio.executarAcao(id, req.usuario!.sub, 'aprovar', observacoes);

    barramento.emitir('documento_aprovado', {
      documentoId: id,
      estudanteId: resultado.documento.estudante_id as string,
      coordenadorId: req.usuario!.sub,
      titulo: resultado.documento.titulo as string,
    });

    res.json(resultado);
  } catch (err: unknown) {
    tratarErroComNaoEncontrado(res, err);
  }
});

// PATCH /api/documentos/:id/reprovar
router.patch('/:id/reprovar', autenticar, exigirPerfil('coordenador', 'admin'), async (req, res) => {
  const { id } = req.params as { id: string };
  const { observacoes } = req.body as { observacoes?: string };
  if (!observacoes) {
    res.status(400).json({ erro: 'Observações são obrigatórias ao reprovar' });
    return;
  }

  try {
    const documento = await buscarDocumento(id);
    if (!verificarAcessoDocumento(res, documento, req.usuario!.perfil, req.usuario!.sub, req.usuario!.curso_ids)) return;

    const resultado = await repositorio.executarAcao(id, req.usuario!.sub, 'reprovar', observacoes);

    barramento.emitir('documento_reprovado', {
      documentoId: id,
      estudanteId: resultado.documento.estudante_id as string,
      coordenadorId: req.usuario!.sub,
      titulo: resultado.documento.titulo as string,
      observacoes,
    });

    res.json(resultado);
  } catch (err: unknown) {
    tratarErroComNaoEncontrado(res, err);
  }
});

// PATCH /api/documentos/:id/solicitar-revisao
router.patch(
  '/:id/solicitar-revisao',
  autenticar,
  exigirPerfil('coordenador', 'admin'),
  async (req, res) => {
    const { id } = req.params as { id: string };
    const { observacoes } = req.body as { observacoes?: string };
    if (!observacoes) {
      res.status(400).json({ erro: 'Observações são obrigatórias ao solicitar revisão' });
      return;
    }

    try {
      const documento = await buscarDocumento(id);
      if (!verificarAcessoDocumento(res, documento, req.usuario!.perfil, req.usuario!.sub, req.usuario!.curso_ids)) return;

      const resultado = await repositorio.executarAcao(
        id,
        req.usuario!.sub,
        'solicitar-revisao',
        observacoes,
      );

      barramento.emitir('documento_revisao_solicitada', {
        documentoId: id,
        estudanteId: resultado.documento.estudante_id as string,
        coordenadorId: req.usuario!.sub,
        titulo: resultado.documento.titulo as string,
        observacoes,
      });

      res.json(resultado);
    } catch (err: unknown) {
      tratarErroComNaoEncontrado(res, err);
    }
  },
);

// GET /api/documentos/:id/historico
router.get('/:id/historico', autenticar, async (req, res) => {
  const { id } = req.params as { id: string };

  try {
    const documento = await buscarDocumento(id);
    if (!verificarAcessoDocumento(res, documento, req.usuario!.perfil, req.usuario!.sub, req.usuario!.curso_ids)) return;
    const historico = await repositorio.buscarHistoricoPorDocumento(id);
    res.json(historico);
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

export default router;
