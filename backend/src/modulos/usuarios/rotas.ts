import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { autenticar } from '../../middleware/autenticacao';
import { exigirPerfil } from '../../middleware/autorizacao';
import * as repositorio from './repositorio';
import { tratarErro } from '../../utils/erros';

const router = Router();

const PERFIS_VALIDOS = ['estudante', 'coordenador', 'admin'] as const;

// ─── Helpers de validação ──────────────────────────────────────

function validarNome(nome: string | undefined, obrigatorio: boolean): string | null {
  if (obrigatorio) {
    if (!nome || typeof nome !== 'string' || nome.trim().length < 2)
      return 'Nome inválido (mínimo 2 caracteres)';
  } else if (nome !== undefined && (typeof nome !== 'string' || nome.trim().length < 2)) {
    return 'Nome inválido (mínimo 2 caracteres)';
  }
  return null;
}

function validarEmail(email: string | undefined, obrigatorio: boolean): string | null {
  if (obrigatorio) {
    if (!email || typeof email !== 'string' || !email.includes('@'))
      return 'E-mail inválido';
  } else if (email !== undefined && (typeof email !== 'string' || !email.includes('@'))) {
    return 'E-mail inválido';
  }
  return null;
}

function validarCpf(cpf: string | null | undefined): string | null {
  if (cpf !== undefined && cpf !== null && String(cpf).replace(/\D/g, '').length !== 11)
    return 'CPF inválido (deve conter 11 dígitos)';
  return null;
}

function formatarCpf(cpf: string): string {
  return cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function normalizarCpf(cpf: string | null | undefined): string | null | undefined {
  if (cpf === undefined) return undefined;
  return cpf ? formatarCpf(String(cpf)) : null;
}

// ─── Rotas ────────────────────────────────────────────────────

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

// PUT /api/usuarios/perfil → atualizar dados pessoais (nome, email, matrícula, cpf, endereço, senha)
router.put('/perfil', autenticar, async (req, res) => {
  const { nome, email, matricula, cpf, endereco, senha_atual, nova_senha } = req.body as {
    nome?: string;
    email?: string;
    matricula?: string | null;
    cpf?: string | null;
    endereco?: string | null;
    senha_atual?: string;
    nova_senha?: string;
  };

  const erroNome = validarNome(nome, false);
  if (erroNome) { res.status(400).json({ erro: erroNome }); return; }

  const erroEmail = validarEmail(email, false);
  if (erroEmail) { res.status(400).json({ erro: erroEmail }); return; }

  const erroCpf = validarCpf(cpf);
  if (erroCpf) { res.status(400).json({ erro: erroCpf }); return; }

  if (nova_senha !== undefined && (typeof nova_senha !== 'string' || nova_senha.length < 6)) {
    res.status(400).json({ erro: 'Nova senha deve ter no mínimo 6 caracteres' });
    return;
  }
  if (nova_senha && !senha_atual) {
    res.status(400).json({ erro: 'Informe a senha atual para alterá-la' });
    return;
  }

  try {
    const atualização: Parameters<typeof repositorio.atualizarPerfil>[1] = {};

    if (nome !== undefined) atualização.nome = nome.trim();
    if (matricula !== undefined) atualização.matricula = matricula?.trim() || null;
    if (cpf !== undefined) atualização.cpf = normalizarCpf(cpf);
    if (endereco !== undefined) atualização.endereco = endereco?.trim() || null;

    if (email !== undefined) {
      const emailNorm = email.trim().toLowerCase();
      const existente = await repositorio.buscarPorEmail(emailNorm);
      if (existente && existente.id !== req.usuario!.sub) {
        res.status(409).json({ erro: 'Este e-mail já está em uso por outro usuário' });
        return;
      }
      atualização.email = emailNorm;
    }

    if (nova_senha && senha_atual) {
      const usuarioAtual = await repositorio.buscarPorEmailParaLogin(req.usuario!.email);
      if (!usuarioAtual) {
        res.status(404).json({ erro: 'Usuário não encontrado' });
        return;
      }
      const senhaCorreta = await bcrypt.compare(senha_atual, usuarioAtual.senha_hash);
      if (!senhaCorreta) {
        res.status(401).json({ erro: 'Senha atual incorreta' });
        return;
      }
      atualização.senha_hash = await bcrypt.hash(nova_senha, 10);
    }

    const usuario = await repositorio.atualizarPerfil(req.usuario!.sub, atualização);
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
  const { nome, email, senha, perfil, matricula, curso_id } = req.body as {
    nome?: string;
    email?: string;
    senha?: string;
    perfil?: string;
    matricula?: string;
    curso_id?: string;
  };

  const erroNome = validarNome(nome, true);
  if (erroNome) { res.status(400).json({ erro: erroNome }); return; }

  const erroEmail = validarEmail(email, true);
  if (erroEmail) { res.status(400).json({ erro: erroEmail }); return; }

  if (!senha || typeof senha !== 'string' || senha.length < 6) {
    res.status(400).json({ erro: 'Senha inválida (mínimo 6 caracteres)' });
    return;
  }
  if (!perfil || !PERFIS_VALIDOS.includes(perfil as typeof PERFIS_VALIDOS[number])) {
    res.status(400).json({ erro: 'Perfil inválido. Use: estudante, coordenador ou admin' });
    return;
  }

  try {
    const existente = await repositorio.buscarPorEmail(email!.trim().toLowerCase());
    if (existente) {
      res.status(409).json({ erro: 'E-mail já cadastrado para outro usuário' });
      return;
    }

    const senha_hash = await bcrypt.hash(senha, 10);
    const usuario = await repositorio.criarUsuario({
      nome: nome!.trim(),
      email: email!.trim().toLowerCase(),
      senha_hash,
      perfil: perfil as typeof PERFIS_VALIDOS[number],
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
  const { nome, email, matricula, cpf, endereco, curso_id, perfil } = req.body as {
    nome?: string;
    email?: string;
    matricula?: string | null;
    cpf?: string | null;
    endereco?: string | null;
    curso_id?: string | null;
    perfil?: string;
  };

  const erroNome = validarNome(nome, false);
  if (erroNome) { res.status(400).json({ erro: erroNome }); return; }

  const erroEmail = validarEmail(email, false);
  if (erroEmail) { res.status(400).json({ erro: erroEmail }); return; }

  const erroCpf = validarCpf(cpf);
  if (erroCpf) { res.status(400).json({ erro: erroCpf }); return; }

  if (perfil !== undefined && !PERFIS_VALIDOS.includes(perfil as typeof PERFIS_VALIDOS[number])) {
    res.status(400).json({ erro: 'Perfil inválido. Use: estudante, coordenador ou admin' });
    return;
  }

  try {
    if (email !== undefined) {
      const emailNorm = email.trim().toLowerCase();
      const existente = await repositorio.buscarPorEmail(emailNorm);
      if (existente && existente.id !== id) {
        res.status(409).json({ erro: 'Este e-mail já está em uso por outro usuário' });
        return;
      }
    }

    const usuario = await repositorio.atualizarUsuario(id, {
      nome: nome?.trim(),
      email: email?.trim().toLowerCase(),
      matricula: matricula ?? undefined,
      cpf: normalizarCpf(cpf),
      endereco: endereco !== undefined ? (endereco?.trim() || null) : undefined,
      curso_id: curso_id ?? undefined,
      perfil: perfil as typeof PERFIS_VALIDOS[number] | undefined,
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
