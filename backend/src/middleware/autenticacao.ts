import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { configuracao } from '../configuracao';

export interface PayloadJWT {
  sub: string;
  email: string;
  nome: string;
  perfil: 'estudante' | 'coordenador' | 'admin';
  matricula?: string | null;
  curso_id?: string | null;
  curso_ids?: string[];
  instituicao_id?: string | null;
  instituicao_nome?: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: PayloadJWT;
    }
  }
}

export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ erro: 'Token não fornecido' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, configuracao.jwt.segredo) as PayloadJWT;
    req.usuario = payload;
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}
