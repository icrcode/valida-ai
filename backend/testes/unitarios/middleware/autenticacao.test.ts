import { Request, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { autenticar } from '../../../src/middleware/autenticacao';
import { criarMockRes } from '../../helpers/mocks';

// Lido do .env.test via setup.ts — nunca hard-codado aqui
const SEGREDO = String(process.env.JWT_SECRET);

function mockReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as Request;
}

describe('autenticar', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
  });

  it('retorna 401 quando não há header Authorization', () => {
    const res = criarMockRes();
    autenticar(mockReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Token não fornecido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o header não começa com "Bearer "', () => {
    const res = criarMockRes();
    autenticar(mockReq('Basic dXNlcjpzZW5oYQ=='), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o token é inválido', () => {
    const res = criarMockRes();
    autenticar(mockReq('Bearer token-invalido'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Token inválido ou expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o token está expirado', () => {
    const token = jwt.sign({ sub: 'id', perfil: 'estudante' }, SEGREDO, { expiresIn: -1 });
    const res = criarMockRes();
    autenticar(mockReq(`Bearer ${token}`), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() e popula req.usuario com token válido de estudante', () => {
    const payload = { sub: 'id-123', email: 'a@b.com', nome: 'João', perfil: 'estudante' };
    const token = jwt.sign(payload, SEGREDO, { expiresIn: '1h' });
    const req = mockReq(`Bearer ${token}`);
    autenticar(req, criarMockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.usuario?.sub).toBe('id-123');
    expect(req.usuario?.perfil).toBe('estudante');
  });

  it('chama next() e popula req.usuario com token válido de coordenador', () => {
    const payload = { sub: 'coord-1', email: 'c@b.com', nome: 'Maria', perfil: 'coordenador' };
    const token = jwt.sign(payload, SEGREDO, { expiresIn: '1h' });
    const req = mockReq(`Bearer ${token}`);
    autenticar(req, criarMockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.usuario?.perfil).toBe('coordenador');
  });
});
