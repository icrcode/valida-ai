import { Router } from 'express';
import { autenticar } from '../../middleware/autenticacao';
import { exigirPerfil } from '../../middleware/autorizacao';
import * as repositorio from './repositorio';
import { tratarErro } from '../../utils/erros';

const router = Router();

// GET /api/usuarios/perfil → dados do usuário logado
router.get('/perfil', autenticar, async (req, res) => {
  try {
    const usuario = await repositorio.buscarPorId(req.usuario!.sub);
    if (!usuario) {
      res.status(404).json({ erro: 'Usuário não encontrado' });
      return;
    }
    res.json(usuario);
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// PUT /api/usuarios/perfil → atualizar nome
router.put('/perfil', autenticar, async (req, res) => {
  const { nome } = req.body as { nome?: string };
  if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
    res.status(400).json({ erro: 'Nome inválido (mínimo 2 caracteres)' });
    return;
  }

  try {
    const usuario = await repositorio.atualizarNome(req.usuario!.sub, nome.trim());
    if (!usuario) {
      res.status(404).json({ erro: 'Usuário não encontrado' });
      return;
    }
    res.json(usuario);
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/usuarios → listar usuários (admin)
router.get('/', autenticar, exigirPerfil('admin'), async (_req, res) => {
  try {
    const usuarios = await repositorio.listarTodos();
    res.json(usuarios);
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

export default router;
