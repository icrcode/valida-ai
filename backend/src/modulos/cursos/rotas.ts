import { Router } from 'express';
import { autenticar } from '../../middleware/autenticacao';
import { exigirPerfil } from '../../middleware/autorizacao';
import * as repositorio from './repositorio';
import * as repoInstituicoes from '../instituicoes/repositorio';
import { tratarErro } from '../../utils/erros';

const router = Router();

const TURNOS = ['matutino', 'vespertino', 'noturno', 'integral'];
const MODALIDADES = ['presencial', 'ead', 'hibrido'];

type CamposCurso = {
  nome?: string;
  carga_horaria_complementar?: number;
  turno?: string | null;
  modalidade?: string | null;
};

function validarCamposCurso(body: CamposCurso, nomeObrigatorio: boolean): string | null {
  const { nome, carga_horaria_complementar, turno, modalidade } = body;

  if (nomeObrigatorio) {
    if (!nome || typeof nome !== 'string' || nome.trim().length < 2)
      return 'Nome inválido (mínimo 2 caracteres)';
  } else if (nome !== undefined && (typeof nome !== 'string' || nome.trim().length < 2)) {
    return 'Nome inválido (mínimo 2 caracteres)';
  }

  if (carga_horaria_complementar !== undefined &&
    (typeof carga_horaria_complementar !== 'number' || carga_horaria_complementar < 1))
    return 'Carga horária deve ser um número positivo';

  if (turno && !TURNOS.includes(turno))
    return `Turno inválido. Use: ${TURNOS.join(', ')}`;

  if (modalidade && !MODALIDADES.includes(modalidade))
    return `Modalidade inválida. Use: ${MODALIDADES.join(', ')}`;

  return null;
}

// GET /api/cursos — lista cursos ativos (público, usado no cadastro de estudantes)
router.get('/', async (_req, res) => {
  try {
    const cursos = await repositorio.listarCursosAtivos();
    res.json(cursos);
  } catch (err: unknown) {
    tratarErro(res, err, 'cursos/listar');
  }
});

// GET /api/cursos/admin — lista todos os cursos com contagem de alunos (admin)
router.get('/admin', autenticar, exigirPerfil('admin'), async (req, res) => {
  const { instituicao_id } = req.query as { instituicao_id?: string };
  try {
    const cursos = await repositorio.listarCursos(instituicao_id);
    res.json(cursos);
  } catch (err: unknown) {
    tratarErro(res, err, 'cursos/listar-admin');
  }
});

// GET /api/cursos/:id — detalhes de um curso (autenticado)
router.get('/:id', autenticar, async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const curso = await repositorio.buscarCursoPorId(id);
    if (!curso) {
      res.status(404).json({ erro: 'Curso não encontrado' });
      return;
    }
    res.json(curso);
  } catch (err: unknown) {
    tratarErro(res, err, 'cursos/buscar');
  }
});

// POST /api/cursos — criar curso (admin); código gerado automaticamente
router.post('/', autenticar, exigirPerfil('admin'), async (req, res) => {
  const { nome, instituicao_id, carga_horaria_complementar, turno, modalidade } = req.body as {
    nome?: string;
    instituicao_id?: string;
    carga_horaria_complementar?: number;
    turno?: string;
    modalidade?: string;
  };

  const erroBody = validarCamposCurso({ nome, carga_horaria_complementar, turno, modalidade }, true);
  if (erroBody) { res.status(400).json({ erro: erroBody }); return; }

  if (!instituicao_id || typeof instituicao_id !== 'string') {
    res.status(400).json({ erro: 'Instituição obrigatória' });
    return;
  }

  try {
    const instituicao = await repoInstituicoes.buscarInstituicaoPorId(instituicao_id);
    if (!instituicao) {
      res.status(400).json({ erro: 'Instituição não encontrada' });
      return;
    }

    const curso = await repositorio.criarCurso({
      nome: nome!.trim(),
      instituicao_id,
      carga_horaria_complementar: carga_horaria_complementar ?? 200,
      turno: turno || null,
      modalidade: modalidade || null,
    });

    res.status(201).json(curso);
  } catch (err: unknown) {
    tratarErro(res, err, 'cursos/criar');
  }
});

// PUT /api/cursos/:id — atualizar curso (admin)
router.put('/:id', autenticar, exigirPerfil('admin'), async (req, res) => {
  const { id } = req.params as { id: string };
  const { nome, instituicao_id, carga_horaria_complementar, turno, modalidade } = req.body as {
    nome?: string;
    instituicao_id?: string;
    carga_horaria_complementar?: number;
    turno?: string | null;
    modalidade?: string | null;
  };

  const erroBody = validarCamposCurso({ nome, carga_horaria_complementar, turno, modalidade }, false);
  if (erroBody) { res.status(400).json({ erro: erroBody }); return; }

  try {
    if (instituicao_id) {
      const instituicao = await repoInstituicoes.buscarInstituicaoPorId(instituicao_id);
      if (!instituicao) {
        res.status(400).json({ erro: 'Instituição não encontrada' });
        return;
      }
    }

    const curso = await repositorio.atualizarCurso(id, {
      nome: nome?.trim(),
      instituicao_id,
      carga_horaria_complementar,
      turno: turno ?? undefined,
      modalidade: modalidade ?? undefined,
    });

    if (!curso) {
      res.status(404).json({ erro: 'Curso não encontrado' });
      return;
    }

    res.json(curso);
  } catch (err: unknown) {
    tratarErro(res, err, 'cursos/atualizar');
  }
});

// PATCH /api/cursos/:id/ativo — ativar/desativar curso (admin)
router.patch('/:id/ativo', autenticar, exigirPerfil('admin'), async (req, res) => {
  const { id } = req.params as { id: string };
  const { ativo } = req.body as { ativo?: boolean };

  if (typeof ativo !== 'boolean') {
    res.status(400).json({ erro: 'Campo "ativo" deve ser boolean' });
    return;
  }

  try {
    const curso = await repositorio.alterarAtivo(id, ativo);
    if (!curso) {
      res.status(404).json({ erro: 'Curso não encontrado' });
      return;
    }
    res.json(curso);
  } catch (err: unknown) {
    tratarErro(res, err, 'cursos/alterarAtivo');
  }
});

export default router;
