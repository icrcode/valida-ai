import { Router } from 'express';
import * as repositorio from './repositorio';
import { tratarErro } from '../../utils/erros';

const router = Router();

// GET /api/cursos — lista todos os cursos ativos (público, usado no cadastro)
router.get('/', async (_req, res) => {
  try {
    const cursos = await repositorio.listarCursos();
    res.json(cursos);
  } catch (err: unknown) {
    tratarErro(res, err, 'cursos/listar');
  }
});

export default router;
