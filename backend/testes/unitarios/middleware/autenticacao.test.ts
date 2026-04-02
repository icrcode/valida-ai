import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { autenticar } from '../../../src/middleware/autenticacao';

const SEGREDO = 'segredo-de-teste';

function mockReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as Request;
}

function mockRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('autenticar', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
  });

  it('retorna 401 quando não há header Authorization', () => {
    const res = mockRes();
    autenticar(mockReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Token não fornecido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o header não começa com "Bearer "', () => {
    const res = mockRes();
    autenticar(mockReq('Basic dXNlcjpzZW5oYQ=='), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o token é inválido', () => {
    const res = mockRes();
    autenticar(mockReq('Bearer token-invalido'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Token inválido ou expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o token está expirado', () => {
    const token = jwt.sign({ sub: 'id', perfil: 'estudante' }, SEGREDO, { expiresIn: -1 });
    const res = mockRes();
    autenticar(mockReq(`Bearer ${token}`), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() e popula req.usuario com token válido de estudante', () => {
    const payload = { sub: 'id-123', email: 'a@b.com', nome: 'João', perfil: 'estudante' };
    const token = jwt.sign(payload, SEGREDO, { expiresIn: '1h' });
    const req = mockReq(`Bearer ${token}`);
    autenticar(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.usuario?.sub).toBe('id-123');
    expect(req.usuario?.perfil).toBe('estudante');
  });

  it('chama next() e popula req.usuario com token válido de coordenador', () => {
    const payload = { sub: 'coord-1', email: 'c@b.com', nome: 'Maria', perfil: 'coordenador' };
    const token = jwt.sign(payload, SEGREDO, { expiresIn: '1h' });
    const req = mockReq(`Bearer ${token}`);
    autenticar(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.usuario?.perfil).toBe('coordenador');
  });
});
