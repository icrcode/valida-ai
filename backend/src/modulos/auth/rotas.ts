import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { configuracao } from '../../configuracao';
import { tratarErro } from '../../utils/erros';
import registrador from '../../utils/registrador';
import { buscarPorEmailParaLogin, type UsuarioParaLogin } from '../usuarios/repositorio';

const router = Router();

function gerarToken(usuario: Omit<UsuarioParaLogin, 'dominios_email' | 'ativo' | 'criado_em' | 'atualizado_em'>): string {
  return jwt.sign(
    {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      perfil: usuario.perfil,
      matricula: usuario.matricula ?? null,
      curso_id: usuario.curso_id ?? null,
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
// Login por e-mail institucional com validação de domínio por instituição.
router.post('/login', async (req, res) => {
  const { email } = req.body as { email?: string };

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({
      erro: 'E-mail inválido',
      mensagem: 'Informe um e-mail institucional válido',
    });
    return;
  }

  const emailNormalizado = email.trim().toLowerCase();

  try {
    const usuario = await buscarPorEmailParaLogin(emailNormalizado);

    if (!usuario) {
      registrador.warn('[auth/login] Usuário não encontrado', { email: emailNormalizado });
      res.status(401).json({
        erro: 'Acesso negado',
        mensagem: 'E-mail não cadastrado ou usuário inativo. Contate o administrador da sua instituição.',
      });
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

    const token = gerarToken(usuario);

    registrador.info('[auth/login] Login bem-sucedido', {
      id: usuario.id,
      perfil: usuario.perfil,
      instituicao: usuario.instituicao_nome,
    });

    res.json({
      token,
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

export default router;
