import { Router, type CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { configuracao } from '../../configuracao';
import { tratarErro } from '../../utils/erros';
import registrador from '../../utils/registrador';
import { autenticar } from '../../middleware/autenticacao';
import {
  buscarPorEmailParaLogin,
  buscarPorEmail,
  criarUsuario,
  type UsuarioParaLogin,
} from '../usuarios/repositorio';
import { buscarCursoPorId, listarCursoIdsDoCoordenador } from '../cursos/repositorio';

const router = Router();

function parseDuracaoMs(duracao: string): number {
  const match = duracao.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return n * 1000;
    case 'm': return n * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'd': return n * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

function opcoesCookie(): CookieOptions {
  return {
    httpOnly: true,
    secure: configuracao.ambienteNode === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: parseDuracaoMs(configuracao.jwt.expiraEm),
  };
}

async function gerarToken(
  usuario: Omit<UsuarioParaLogin, 'dominios_email' | 'ativo' | 'criado_em' | 'atualizado_em' | 'senha_hash'>,
): Promise<string> {
  const curso_ids = usuario.perfil === 'coordenador'
    ? await listarCursoIdsDoCoordenador(usuario.id)
    : undefined;

  return jwt.sign(
    {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      perfil: usuario.perfil,
      matricula: usuario.matricula ?? null,
      curso_id: usuario.curso_id ?? null,
      ...(curso_ids ? { curso_ids } : {}),
      instituicao_id: usuario.instituicao_id ?? null,
      instituicao_nome: usuario.instituicao_nome ?? null,
    },
    configuracao.jwt.segredo,
    { expiresIn: configuracao.jwt.expiraEm } as jwt.SignOptions,
  );
}

function extrairDominio(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

// POST /api/auth/login
// Login por e-mail + senha com validação de domínio por instituição.
router.post('/login', async (req, res) => {
  const { email, senha } = req.body as { email?: string; senha?: string };

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ erro: 'E-mail inválido', mensagem: 'Informe um e-mail válido' });
    return;
  }
  if (!senha || typeof senha !== 'string') {
    res.status(400).json({ erro: 'Senha obrigatória', mensagem: 'Informe sua senha' });
    return;
  }

  const emailNormalizado = email.trim().toLowerCase();

  try {
    const usuario = await buscarPorEmailParaLogin(emailNormalizado);

    if (!usuario) {
      registrador.warn('[auth/login] Usuário não encontrado', { email: emailNormalizado });
      res.status(401).json({
        erro: 'Credenciais inválidas',
        mensagem: 'E-mail ou senha incorretos.',
      });
      return;
    }

    if (!usuario.senha_hash || usuario.senha_hash === '') {
      res.status(401).json({
        erro: 'Conta sem senha',
        mensagem: 'Esta conta ainda não possui senha configurada. Contate o administrador.',
      });
      return;
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      registrador.warn('[auth/login] Senha incorreta', { email: emailNormalizado });
      res.status(401).json({ erro: 'Credenciais inválidas', mensagem: 'E-mail ou senha incorretos.' });
      return;
    }

    if (usuario.dominios_email && usuario.dominios_email.length > 0) {
      const dominio = extrairDominio(emailNormalizado);
      const dominioAceito = usuario.dominios_email
        .map((d) => d.toLowerCase().trim())
        .includes(dominio);

      if (!dominioAceito) {
        registrador.warn('[auth/login] Domínio de e-mail não aceito', {
          email: emailNormalizado,
          dominio,
          instituicao: usuario.instituicao_nome,
        });
        res.status(403).json({
          erro: 'Domínio de e-mail não autorizado',
          mensagem: `O domínio @${dominio} não é aceito pela instituição "${usuario.instituicao_nome ?? ''}". Use o e-mail institucional correto.`,
        });
        return;
      }
    }

    const token = await gerarToken(usuario);

    registrador.info('[auth/login] Login bem-sucedido', {
      id: usuario.id,
      perfil: usuario.perfil,
      instituicao: usuario.instituicao_nome,
    });

    res.cookie('valida_token', token, opcoesCookie());
    res.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        matricula: usuario.matricula,
        curso_id: usuario.curso_id,
        instituicao_id: usuario.instituicao_id,
        instituicao_nome: usuario.instituicao_nome,
      },
    });
  } catch (err: unknown) {
    tratarErro(res, err, 'auth/login');
  }
});

// POST /api/auth/cadastro
// Auto-registro de estudantes com e-mail institucional + senha.
router.post('/cadastro', async (req, res) => {
  const { nome, email, senha, matricula, curso_id } = req.body as {
    nome?: string;
    email?: string;
    senha?: string;
    matricula?: string;
    curso_id?: string;
  };

  if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
    res.status(400).json({ erro: 'Nome inválido', mensagem: 'Informe seu nome completo (mínimo 2 caracteres)' });
    return;
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ erro: 'E-mail inválido', mensagem: 'Informe um e-mail válido' });
    return;
  }
  if (!senha || typeof senha !== 'string' || senha.length < 6) {
    res.status(400).json({ erro: 'Senha inválida', mensagem: 'A senha deve ter no mínimo 6 caracteres' });
    return;
  }
  if (!matricula || typeof matricula !== 'string' || matricula.trim().length < 2) {
    res.status(400).json({ erro: 'Matrícula inválida', mensagem: 'Informe sua matrícula acadêmica' });
    return;
  }
  if (!curso_id || typeof curso_id !== 'string') {
    res.status(400).json({ erro: 'Curso inválido', mensagem: 'Selecione seu curso' });
    return;
  }

  const emailNormalizado = email.trim().toLowerCase();
  const nomeNormalizado = nome.trim();
  const matriculaNormalizada = matricula.trim();

  try {
    const existente = await buscarPorEmail(emailNormalizado);
    if (existente) {
      res.status(409).json({ erro: 'E-mail já cadastrado', mensagem: 'Este e-mail já possui uma conta. Faça login.' });
      return;
    }

    const curso = await buscarCursoPorId(curso_id);
    if (!curso) {
      res.status(400).json({ erro: 'Curso não encontrado', mensagem: 'O curso selecionado não existe ou está inativo' });
      return;
    }

    if (curso.dominios_email && curso.dominios_email.length > 0) {
      const dominio = extrairDominio(emailNormalizado);
      const dominioAceito = curso.dominios_email.map((d) => d.toLowerCase().trim()).includes(dominio);
      if (!dominioAceito) {
        res.status(403).json({
          erro: 'Domínio de e-mail não autorizado',
          mensagem: `O domínio @${dominio} não é aceito pela instituição "${curso.instituicao_nome}". Use o e-mail institucional correto.`,
        });
        return;
      }
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const novoUsuario = await criarUsuario({
      nome: nomeNormalizado,
      email: emailNormalizado,
      senha_hash,
      perfil: 'estudante',
      matricula: matriculaNormalizada,
      curso_id,
    });

    const token = await gerarToken(novoUsuario);

    registrador.info('[auth/cadastro] Novo estudante cadastrado', {
      id: novoUsuario.id,
      instituicao: curso.instituicao_nome,
    });

    res.cookie('valida_token', token, opcoesCookie());
    res.status(201).json({
      usuario: {
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        perfil: novoUsuario.perfil,
        matricula: novoUsuario.matricula,
        curso_id: novoUsuario.curso_id,
        instituicao_id: novoUsuario.instituicao_id,
        instituicao_nome: novoUsuario.instituicao_nome,
      },
    });
  } catch (err: unknown) {
    tratarErro(res, err, 'auth/cadastro');
  }
});

router.get('/me', autenticar, (req, res) => {
  const u = req.usuario!;
  res.json({
    usuario: {
      id: u.sub,
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      matricula: u.matricula ?? null,
      curso_id: u.curso_id ?? null,
      instituicao_id: u.instituicao_id ?? null,
      instituicao_nome: u.instituicao_nome ?? null,
    },
  });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('valida_token', { path: '/' });
  res.json({ mensagem: 'Logout realizado' });
});

export default router;
