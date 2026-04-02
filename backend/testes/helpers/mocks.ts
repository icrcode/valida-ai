import type { Request, Response, NextFunction } from 'express';

export function criarModuloAutenticacao(sub: string, perfil: string, email: string, nome: string) {
  return {
    autenticar: (req: Request, _res: Response, next: NextFunction) => {
      (req as any).usuario = { sub, perfil, email, nome };
      next();
    },
  };
}

export const moduloAutorizacao = {
  exigirPerfil: () => (_req: Request, _res: Response, next: NextFunction) => next(),
};

export function criarMockRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}
