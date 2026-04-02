import express from 'express';
import request from 'supertest';

jest.mock('../../src/modulos/documentos/repositorio');
jest.mock('../../src/modulos/usuarios/repositorio');
jest.mock('../../src/servicos/armazenamento');
jest.mock('../../src/middleware/autenticacao', () => ({
  autenticar: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as any).usuario = {
      sub: 'estudante-id',
      perfil: 'estudante',
      email: 'est@test.com',
      nome: 'Estudante Teste',
    };
    next();
  },
}));
jest.mock('../../src/middleware/autorizacao', () => ({
  exigirPerfil: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

import * as repositorioDoc from '../../src/modulos/documentos/repositorio';
import * as repositorioUsr from '../../src/modulos/usuarios/repositorio';
import * as armazenamento from '../../src/servicos/armazenamento';
import router from '../../src/modulos/documentos/rotas';

const mockDoc = repositorioDoc as jest.Mocked<typeof repositorioDoc>;
const mockUsr = repositorioUsr as jest.Mocked<typeof repositorioUsr>;
const mockArm = armazenamento as jest.Mocked<typeof armazenamento>;

const app = express();
app.use(express.json());
app.use('/', router);

const DOC_MOCK: repositorioDoc.Documento = {
  id: 'doc-1',
  titulo: 'Estágio XYZ',
  tipo: 'estagio',
  carga_horaria: 40,
  estudante_id: 'estudante-id',
  curso_id: 'curso-1',
  status: 'pendente',
  coordenador_id: null,
  nome_arquivo: 'estagio.pdf',
  caminho_arquivo: 'documentos/estudante-id/estagio.pdf',
  tamanho_arquivo: 1024,
  mime_type: 'application/pdf',
  criado_em: new Date(),
  atualizado_em: new Date(),
};

describe('GET /', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 com lista paginada de documentos', async () => {
    mockDoc.listar.mockResolvedValueOnce({ dados: [DOC_MOCK], total: 1 });
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.dados).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.pagina).toBe(1);
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockDoc.listar.mockRejectedValueOnce(new Error('Erro DB'));
    const res = await request(app).get('/');
    expect(res.status).toBe(500);
  });
});

describe('GET /:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 com o documento encontrado', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    const res = await request(app).get('/doc-1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('doc-1');
    expect(res.body.titulo).toBe('Estágio XYZ');
  });

  it('retorna 404 quando o documento não existe', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(null);
    const res = await request(app).get('/nao-existe');
    expect(res.status).toBe(404);
  });

  it('retorna 403 quando estudante tenta acessar documento de outro estudante', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce({ ...DOC_MOCK, estudante_id: 'outro-estudante' });
    const res = await request(app).get('/doc-outro');
    expect(res.status).toBe(403);
    expect(res.body.erro).toContain('permissão');
  });
});

describe('GET /:id/download', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 com URL assinada para download', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockArm.gerarUrlAssinada.mockResolvedValueOnce('https://minio/signed-url');
    const res = await request(app).get('/doc-1/download');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://minio/signed-url');
    expect(res.body.expira_em).toBeDefined();
  });

  it('retorna 404 quando o documento não é encontrado', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce(null);
    const res = await request(app).get('/nao-existe/download');
    expect(res.status).toBe(404);
  });

  it('retorna 403 para estudante tentando baixar documento de outro', async () => {
    mockDoc.buscarPorId.mockResolvedValueOnce({ ...DOC_MOCK, estudante_id: 'outro-id' });
    const res = await request(app).get('/doc-outro/download');
    expect(res.status).toBe(403);
  });
});

describe('POST /', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 quando nenhum arquivo é enviado', async () => {
    const res = await request(app)
      .post('/')
      .field('titulo', 'Estágio')
      .field('tipo', 'estagio')
      .field('carga_horaria', '40');
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('arquivo');
  });

  it('retorna 400 quando campos obrigatórios estão ausentes', async () => {
    const res = await request(app)
      .post('/')
      .attach('arquivo', Buffer.from('%PDF-1.4'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
      .field('titulo', 'Apenas título');
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('obrigatórios');
  });

  it('retorna 400 quando carga_horaria não é um número válido', async () => {
    const res = await request(app)
      .post('/')
      .attach('arquivo', Buffer.from('%PDF-1.4'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
      .field('titulo', 'Estágio')
      .field('tipo', 'estagio')
      .field('carga_horaria', 'abc');
    expect(res.status).toBe(400);
    expect(res.body.erro).toContain('carga_horaria');
  });

  it('retorna 422 quando o estudante não tem curso associado', async () => {
    mockUsr.buscarPorId.mockResolvedValueOnce({ id: 'estudante-id', curso_id: null } as any);
    const res = await request(app)
      .post('/')
      .attach('arquivo', Buffer.from('%PDF-1.4'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
      .field('titulo', 'Estágio XYZ')
      .field('tipo', 'estagio')
      .field('carga_horaria', '40');
    expect(res.status).toBe(422);
    expect(res.body.erro).toContain('curso');
  });

  it('retorna 201 com o documento criado após upload bem-sucedido', async () => {
    mockUsr.buscarPorId.mockResolvedValueOnce({ id: 'estudante-id', curso_id: 'curso-1' } as any);
    mockArm.fazerUpload.mockResolvedValueOnce('documentos/estudante-id/estagio.pdf');
    mockDoc.criar.mockResolvedValueOnce(DOC_MOCK);

    const res = await request(app)
      .post('/')
      .attach('arquivo', Buffer.from('%PDF-1.4'), {
        filename: 'estagio.pdf',
        contentType: 'application/pdf',
      })
      .field('titulo', 'Estágio XYZ')
      .field('tipo', 'estagio')
      .field('carga_horaria', '40');
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('doc-1');
    expect(res.body.titulo).toBe('Estágio XYZ');
  });
});

describe('DELETE /:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 ao cancelar o documento com sucesso', async () => {
    mockDoc.cancelar.mockResolvedValueOnce({ ...DOC_MOCK, status: 'cancelado' });
    const res = await request(app).delete('/doc-1');
    expect(res.status).toBe(200);
    expect(res.body.mensagem).toContain('cancelado');
  });

  it('retorna 404 quando o documento não existe ou já não está pendente', async () => {
    mockDoc.cancelar.mockResolvedValueOnce(null);
    const res = await request(app).delete('/nao-existe');
    expect(res.status).toBe(404);
  });
});
