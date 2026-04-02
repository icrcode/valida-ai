import { Response } from 'express';
import { tratarErro, tratarErroComNaoEncontrado } from '../../../src/utils/erros';

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('tratarErro', () => {
  it('retorna 500 com a mensagem quando o erro é uma instância de Error', () => {
    const res = mockRes();
    tratarErro(res, new Error('falha no banco'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Erro interno', detalhe: 'falha no banco' });
  });

  it('retorna 500 com "Erro desconhecido" para valores não-Error', () => {
    const res = mockRes();
    tratarErro(res, 'string de erro');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Erro interno', detalhe: 'Erro desconhecido' });
  });

  it('retorna 500 com "Erro desconhecido" para null', () => {
    const res = mockRes();
    tratarErro(res, null);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Erro interno', detalhe: 'Erro desconhecido' });
  });
});

describe('tratarErroComNaoEncontrado', () => {
  it('retorna 404 quando a mensagem contém "não encontrado"', () => {
    const res = mockRes();
    tratarErroComNaoEncontrado(res, new Error('Documento não encontrado ou cancelado'));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Documento não encontrado ou cancelado' });
  });

  it('retorna 500 para erros que não são de recurso inexistente', () => {
    const res = mockRes();
    tratarErroComNaoEncontrado(res, new Error('Falha de conexão'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Erro interno', detalhe: 'Falha de conexão' });
  });

  it('retorna 500 com "Erro desconhecido" para não-Error', () => {
    const res = mockRes();
    tratarErroComNaoEncontrado(res, 42);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Erro interno', detalhe: 'Erro desconhecido' });
  });
});
