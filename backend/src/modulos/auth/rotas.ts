import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../../banco/conexao';
import { configuracao } from '../../configuracao';

const router = Router();

/**
 * POST /api/auth/login-dev
 * Endpoint de login simplificado para desenvolvimento e testes.
 * Em produção, utilizar autenticação Microsoft OAuth (Azure AD).
 */
router.post('/login-dev', async (req, res) => {
  if (configuracao.ambienteNode === 'production') {
    res.status(404).json({ erro: 'Endpoint não disponível em produção' });
    return;
  }

  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ erro: 'Campo obrigatório: email' });
    return;
  }

  try {
    const resultado = await pool.query(
      'SELECT id, nome, email, perfil FROM usuarios WHERE email = $1 AND ativo = true',
      [email],
    );

    if (resultado.rows.length === 0) {
      res.status(404).json({ erro: 'Usuário não encontrado ou inativo' });
      return;
    }

    const usuario = resultado.rows[0] as {
      id: string;
      nome: string;
      email: string;
      perfil: string;
    };

    const token = jwt.sign(
      { sub: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil },
      configuracao.jwt.segredo,
      { expiresIn: configuracao.jwt.expiraEm } as jwt.SignOptions,
    );

    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    });
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ erro: 'Erro interno', detalhe: mensagem });
  }
});

export default router;
