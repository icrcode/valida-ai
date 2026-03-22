import { Request, Response, NextFunction } from 'express';

type Perfil = 'estudante' | 'coordenador' | 'admin';

export function exigirPerfil(...perfis: Perfil[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ erro: 'Não autenticado' });
      return;
    }
    if (!perfis.includes(req.usuario.perfil)) {
      res.status(403).json({ erro: 'Sem permissão para este recurso' });
      return;
    }
    next();
  };
}
