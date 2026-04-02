import { Request, Response, NextFunction } from 'express';
import { exigirPerfil } from '../../../src/middleware/autorizacao';

function mockRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

function mockReqComUsuario(perfil?: string): Request {
  return { usuario: perfil ? { perfil } : undefined } as unknown as Request;
}

describe('exigirPerfil', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
  });

  it('retorna 401 quando req.usuario não está definido', () => {
    const res = mockRes();
    exigirPerfil('coordenador')(mockReqComUsuario(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Não autenticado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 quando o perfil não tem permissão', () => {
    const res = mockRes();
    exigirPerfil('coordenador', 'admin')(mockReqComUsuario('estudante'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Sem permissão para este recurso' });
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() quando o perfil tem permissão exata', () => {
    exigirPerfil('coordenador')(mockReqComUsuario('coordenador'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('chama next() quando o perfil está na lista de perfis aceitos', () => {
    exigirPerfil('coordenador', 'admin')(mockReqComUsuario('admin'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('chama next() para admin quando vários perfis são aceitos', () => {
    exigirPerfil('estudante', 'coordenador', 'admin')(mockReqComUsuario('admin'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
