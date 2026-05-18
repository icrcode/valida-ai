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

// GET /api/usuarios → listar usuários (admin, filtrável por instituição)
router.get('/', autenticar, exigirPerfil('admin'), async (req, res) => {
  const { instituicao_id } = req.query as { instituicao_id?: string };
  try {
    const usuarios = await repositorio.listarTodos(instituicao_id);
    res.json(usuarios);
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// POST /api/usuarios → criar usuário (admin)
router.post('/', autenticar, exigirPerfil('admin'), async (req, res) => {
  const { nome, email, perfil, matricula, curso_id } = req.body as {
    nome?: string;
    email?: string;
    perfil?: string;
    matricula?: string;
    curso_id?: string;
  };

  if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
    res.status(400).json({ erro: 'Nome inválido (mínimo 2 caracteres)' });
    return;
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ erro: 'E-mail inválido' });
    return;
  }
  if (!perfil || !['estudante', 'coordenador', 'admin'].includes(perfil)) {
    res.status(400).json({ erro: 'Perfil inválido. Use: estudante, coordenador ou admin' });
    return;
  }

  try {
    const existente = await repositorio.buscarPorEmail(email.trim().toLowerCase());
    if (existente) {
      res.status(409).json({ erro: 'E-mail já cadastrado para outro usuário' });
      return;
    }

    const usuario = await repositorio.criarUsuario({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      perfil: perfil as 'estudante' | 'coordenador' | 'admin',
      matricula: matricula?.trim() || null,
      curso_id: curso_id || null,
    });

    res.status(201).json(usuario);
  } catch (err: unknown) {
    tratarErro(res, err, 'usuarios/criar');
  }
});

// PUT /api/usuarios/:id → atualizar usuário (admin)
router.put('/:id', autenticar, exigirPerfil('admin'), async (req, res) => {
  const { id } = req.params as { id: string };
  const { nome, matricula, curso_id, perfil } = req.body as {
    nome?: string;
    matricula?: string | null;
    curso_id?: string | null;
    perfil?: string;
  };

  if (nome !== undefined && (typeof nome !== 'string' || nome.trim().length < 2)) {
    res.status(400).json({ erro: 'Nome inválido (mínimo 2 caracteres)' });
    return;
  }
  if (perfil !== undefined && !['estudante', 'coordenador', 'admin'].includes(perfil)) {
    res.status(400).json({ erro: 'Perfil inválido. Use: estudante, coordenador ou admin' });
    return;
  }

  try {
    const usuario = await repositorio.atualizarUsuario(id, {
      nome: nome?.trim(),
      matricula: matricula ?? undefined,
      curso_id: curso_id ?? undefined,
      perfil: perfil as 'estudante' | 'coordenador' | 'admin' | undefined,
    });

    if (!usuario) {
      res.status(404).json({ erro: 'Usuário não encontrado' });
      return;
    }

    res.json(usuario);
  } catch (err: unknown) {
    tratarErro(res, err, 'usuarios/atualizar');
  }
});

// PATCH /api/usuarios/:id/ativo → ativar/desativar usuário (admin)
router.patch('/:id/ativo', autenticar, exigirPerfil('admin'), async (req, res) => {
  const { id } = req.params as { id: string };
  const { ativo } = req.body as { ativo?: boolean };

  if (typeof ativo !== 'boolean') {
    res.status(400).json({ erro: 'Campo "ativo" deve ser boolean' });
    return;
  }

  if (id === req.usuario!.sub) {
    res.status(400).json({ erro: 'Você não pode desativar sua própria conta' });
    return;
  }

  try {
    const usuario = await repositorio.alterarAtivo(id, ativo);
    if (!usuario) {
      res.status(404).json({ erro: 'Usuário não encontrado' });
      return;
    }
    res.json(usuario);
  } catch (err: unknown) {
    tratarErro(res, err, 'usuarios/alterarAtivo');
  }
});

export default router;
