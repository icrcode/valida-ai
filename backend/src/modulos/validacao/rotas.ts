import { Router } from 'express';
import { autenticar } from '../../middleware/autenticacao';
import { exigirPerfil } from '../../middleware/autorizacao';
import { buscarPorId as buscarDocumento } from '../documentos/repositorio';
import * as repositorio from './repositorio';

const router = Router();

// PATCH /api/documentos/:id/aprovar
router.patch('/:id/aprovar', autenticar, exigirPerfil('coordenador', 'admin'), async (req, res) => {
  const { id } = req.params as { id: string };
  const { observacoes } = req.body as { observacoes?: string };

  try {
    const resultado = await repositorio.executarAcao(id, req.usuario!.sub, 'aprovar', observacoes);
    res.json(resultado);
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
    if (mensagem.includes('não encontrado')) {
      res.status(404).json({ erro: mensagem });
      return;
    }
    res.status(500).json({ erro: 'Erro interno', detalhe: mensagem });
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
    const resultado = await repositorio.executarAcao(id, req.usuario!.sub, 'reprovar', observacoes);
    res.json(resultado);
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
    if (mensagem.includes('não encontrado')) {
      res.status(404).json({ erro: mensagem });
      return;
    }
    res.status(500).json({ erro: 'Erro interno', detalhe: mensagem });
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
      const resultado = await repositorio.executarAcao(
        id,
        req.usuario!.sub,
        'solicitar-revisao',
        observacoes,
      );
      res.json(resultado);
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
      if (mensagem.includes('não encontrado')) {
        res.status(404).json({ erro: mensagem });
        return;
      }
      res.status(500).json({ erro: 'Erro interno', detalhe: mensagem });
    }
  },
);

// GET /api/documentos/:id/historico
router.get('/:id/historico', autenticar, async (req, res) => {
  const { id } = req.params as { id: string };

  try {
    const documento = await buscarDocumento(id);
    if (!documento) {
      res.status(404).json({ erro: 'Documento não encontrado' });
      return;
    }

    if (req.usuario!.perfil === 'estudante' && documento.estudante_id !== req.usuario!.sub) {
      res.status(403).json({ erro: 'Sem permissão para este documento' });
      return;
    }

    const historico = await repositorio.buscarHistoricoPorDocumento(id);
    res.json(historico);
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ erro: 'Erro interno', detalhe: mensagem });
  }
});

export default router;
