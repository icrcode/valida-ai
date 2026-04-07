import request from 'supertest';

jest.mock('../../src/modulos/certificados/repositorio');
jest.mock('../../src/modulos/documentos/repositorio');
jest.mock('../../src/servicos/armazenamento');
jest.mock('../../src/middleware/autenticacao', () =>
  require('../helpers/mocks').criarModuloAutenticacao('estudante-id', 'estudante', 'est@test.com', 'Estudante Teste')
);
jest.mock('../../src/middleware/autorizacao', () =>
  require('../helpers/mocks').moduloAutorizacao
);

import * as repositorioCert from '../../src/modulos/certificados/repositorio';
import * as repositorioDoc from '../../src/modulos/documentos/repositorio';
import * as armazenamento from '../../src/servicos/armazenamento';
import router from '../../src/modulos/certificados/rotas';
import { criarApp } from '../helpers/app';
import { DOC_MOCK } from '../helpers/fixtures';

const mockCert = repositorioCert as jest.Mocked<typeof repositorioCert>;
const mockDoc = repositorioDoc as jest.Mocked<typeof repositorioDoc>;
const mockArm = armazenamento as jest.Mocked<typeof armazenamento>;

const app = criarApp(router);

const CERT_MOCK = {
  id: 'cert-1',
  documento_id: 'doc-1',
  estudante_id: 'estudante-id',
  hash: 'a'.repeat(64),
  caminho_arquivo: 'certificados/doc-1/aaaa.pdf',
  criado_em: new Date(),
};

// ─────────────────────────────────────────────
// GET /:id
// ─────────────────────────────────────────────
describe('GET /:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 com certificado e documento do próprio estudante', async () => {
    mockCert.buscarPorId.mockResolvedValueOnce(CERT_MOCK);
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);

    const res = await request(app).get('/cert-1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('cert-1');
    expect(res.body.hash).toBe('a'.repeat(64));
    expect(res.body.documento).toBeDefined();
  });

  it('retorna 404 quando o certificado não existe', async () => {
    mockCert.buscarPorId.mockResolvedValueOnce(null);

    const res = await request(app).get('/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body.erro).toContain('não encontrado');
  });

  it('retorna 403 quando estudante tenta acessar certificado de outro', async () => {
    mockCert.buscarPorId.mockResolvedValueOnce({
      ...CERT_MOCK,
      estudante_id: 'outro-estudante',
    });

    const res = await request(app).get('/cert-alheio');
    expect(res.status).toBe(403);
    expect(res.body.erro).toContain('permissão');
  });

  it('retorna 500 em caso de erro inesperado no repositório', async () => {
    mockCert.buscarPorId.mockRejectedValueOnce(new Error('DB off'));

    const res = await request(app).get('/cert-1');
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────
// GET /:id/download
// ─────────────────────────────────────────────
describe('GET /:id/download', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 com URL assinada e data de expiração', async () => {
    mockCert.buscarPorId.mockResolvedValueOnce(CERT_MOCK);
    mockArm.gerarUrlAssinadaCertificado.mockResolvedValueOnce('https://minio/certificado-url');

    const res = await request(app).get('/cert-1/download');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://minio/certificado-url');
    expect(res.body.expira_em).toBeDefined();
  });

  it('retorna 404 quando o certificado não existe', async () => {
    mockCert.buscarPorId.mockResolvedValueOnce(null);

    const res = await request(app).get('/nao-existe/download');
    expect(res.status).toBe(404);
  });

  it('retorna 403 quando estudante tenta baixar certificado de outro', async () => {
    mockCert.buscarPorId.mockResolvedValueOnce({
      ...CERT_MOCK,
      estudante_id: 'outro-estudante',
    });

    const res = await request(app).get('/cert-alheio/download');
    expect(res.status).toBe(403);
  });

  it('retorna 500 quando gerarUrlAssinada falha', async () => {
    mockCert.buscarPorId.mockResolvedValueOnce(CERT_MOCK);
    mockArm.gerarUrlAssinadaCertificado.mockRejectedValueOnce(new Error('MinIO timeout'));

    const res = await request(app).get('/cert-1/download');
    expect(res.status).toBe(500);
  });
});
