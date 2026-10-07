import request from 'supertest';

jest.mock('../../src/blockchain/servico');
jest.mock('../../src/blockchain/repositorio');

import * as servico from '../../src/blockchain/servico';
import * as repositorio from '../../src/blockchain/repositorio';
import router from '../../src/blockchain/rotas';
import { sha256 } from '../../src/blockchain/criptografia';
import { criarApp } from '../helpers/app';

const mockServico = servico as jest.Mocked<typeof servico>;
const mockRepo = repositorio as jest.Mocked<typeof repositorio>;

const app = criarApp(router);

const PROVA_MOCK = {
  transacao: {
    id: 'a'.repeat(64),
    tipo: 'DOCUMENTO_SUBMETIDO' as const,
    documentoId: 'doc-1',
    hashArquivo: 'b'.repeat(64),
    dados: {},
    timestamp: new Date().toISOString(),
    sal: '00',
  },
  bloco: {
    altura: 1,
    hash: '00' + 'c'.repeat(62),
    hashAnterior: '00' + 'd'.repeat(62),
    raizMerkle: 'a'.repeat(64),
    timestamp: new Date().toISOString(),
    validador: 'chave',
    assinatura: 'assinatura',
  },
  provaMerkle: [],
  provaValida: true,
  confirmacoes: 1,
};

beforeEach(() => jest.clearAllMocks());

describe('GET /validar', () => {
  it('retorna o resultado da validação da cadeia', async () => {
    mockServico.validarCadeiaCompleta.mockResolvedValueOnce({ valida: true, blocosVerificados: 3, erros: [] });
    const res = await request(app).get('/validar');
    expect(res.status).toBe(200);
    expect(res.body.valida).toBe(true);
  });

  it('retorna 500 em caso de erro', async () => {
    mockServico.validarCadeiaCompleta.mockRejectedValueOnce(new Error('DB'));
    const res = await request(app).get('/validar');
    expect(res.status).toBe(500);
  });
});

describe('GET /blocos/:id', () => {
  it('busca por altura', async () => {
    mockRepo.buscarBloco.mockResolvedValueOnce({ altura: 2 } as never);
    const res = await request(app).get('/blocos/2');
    expect(res.status).toBe(200);
    expect(mockRepo.buscarBloco).toHaveBeenCalledWith(2);
  });

  it('busca por hash', async () => {
    mockRepo.buscarBlocoPorHash.mockResolvedValueOnce({ altura: 2 } as never);
    const res = await request(app).get(`/blocos/${'A'.repeat(64)}`);
    expect(res.status).toBe(200);
    expect(mockRepo.buscarBlocoPorHash).toHaveBeenCalledWith('a'.repeat(64));
  });

  it('retorna 404 para identificador inválido ou inexistente', async () => {
    const res = await request(app).get('/blocos/xyz');
    expect(res.status).toBe(404);
  });
});

describe('GET /blocos', () => {
  it('limita a paginação a 50 itens', async () => {
    mockRepo.listarPaginado.mockResolvedValueOnce({ dados: [], total: 0 });
    const res = await request(app).get('/blocos?limite=500');
    expect(res.status).toBe(200);
    expect(mockRepo.listarPaginado).toHaveBeenCalledWith(1, 50);
  });
});

describe('GET /arquivos/:hash', () => {
  it('rejeita hash mal formado', async () => {
    const res = await request(app).get('/arquivos/123');
    expect(res.status).toBe(400);
  });

  it('informa quando o arquivo está registrado', async () => {
    mockServico.provasPorHashArquivo.mockResolvedValueOnce([PROVA_MOCK]);
    const res = await request(app).get(`/arquivos/${'b'.repeat(64)}`);
    expect(res.body.registrado).toBe(true);
    expect(res.body.provas).toHaveLength(1);
  });
});

describe('POST /verificar-arquivo', () => {
  it('calcula o SHA-256 do arquivo enviado e procura na cadeia', async () => {
    mockServico.provasPorHashArquivo.mockResolvedValueOnce([]);
    const conteudo = Buffer.from('%PDF-1.4 conteudo');
    const res = await request(app)
      .post('/verificar-arquivo')
      .attach('arquivo', conteudo, { filename: 'doc.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hashArquivo: sha256(conteudo), registrado: false, provas: [] });
    expect(mockServico.provasPorHashArquivo).toHaveBeenCalledWith(sha256(conteudo));
  });

  it('retorna 400 sem arquivo', async () => {
    const res = await request(app).post('/verificar-arquivo');
    expect(res.status).toBe(400);
  });
});

describe('GET /documentos/:documentoId', () => {
  it('retorna a linha do tempo do documento', async () => {
    mockServico.historicoDocumento.mockResolvedValueOnce([PROVA_MOCK]);
    const res = await request(app).get('/documentos/doc-1');
    expect(res.body.registrado).toBe(true);
    expect(res.body.historico[0].transacao.tipo).toBe('DOCUMENTO_SUBMETIDO');
  });
});
