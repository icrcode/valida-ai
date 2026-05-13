import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../../banco/conexao';
import { configuracao } from '../../configuracao';
import { tratarErro } from '../../utils/erros';
import registrador from '../../utils/registrador';

const router = Router();

interface UsuarioLogin {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  matricula: string | null;
  curso_id: string | null;
  instituicao_id: string | null;
  instituicao_nome: string | null;
  dominios_email: string[] | null;
}

function gerarToken(usuario: Omit<UsuarioLogin, 'dominios_email'>): string {
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

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Login por e-mail institucional com validação de domínio por instituição.
// Relação: usuarios → cursos → instituicoes (para obter dominios_email)
// ---------------------------------------------------------------------------
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
    const resultado = await pool.query<UsuarioLogin>(
      `SELECT
         u.id,
         u.nome,
         u.email,
         u.perfil,
         u.matricula,
         u.curso_id,
         c.instituicao_id,
         i.nome          AS instituicao_nome,
         i.dominios_email
       FROM usuarios u
       LEFT JOIN cursos c       ON c.id = u.curso_id         AND c.ativo    = true
       LEFT JOIN instituicoes i ON i.id = c.instituicao_id   AND i.ativa    = true
       WHERE LOWER(u.email) = $1
         AND u.ativo = true`,
      [emailNormalizado],
    );

    if (resultado.rows.length === 0) {
      registrador.warn('[auth/login] Usuário não encontrado', { email: emailNormalizado });
      res.status(401).json({
        erro: 'Acesso negado',
        mensagem:
          'E-mail não cadastrado ou usuário inativo. Contate o administrador da sua instituição.',
      });
      return;
    }

    const usuario = resultado.rows[0];

    // Valida o domínio do e-mail contra os domínios aceitos pela instituição
    if (usuario.dominios_email && usuario.dominios_email.length > 0) {
      const dominio = extrairDominio(emailNormalizado);
      const dominioAceito = usuario.dominios_email
        .map((d) => d.toLowerCase().trim())
        .includes(dominio);

      if (!dominioAceito) {
        registrador.warn('[auth/login] Domínio de e-mail não aceito', {
          email: emailNormalizado,
          dominio,
          dominiosAceitos: usuario.dominios_email,
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
