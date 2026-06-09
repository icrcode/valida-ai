import request from 'supertest';

jest.mock('../../src/modulos/certificados/repositorio');
jest.mock('../../src/modulos/documentos/repositorio');
jest.mock('../../src/modulos/usuarios/repositorio');

import * as repositorioCert from '../../src/modulos/certificados/repositorio';
import * as repositorioDoc from '../../src/modulos/documentos/repositorio';
import * as repositorioUsr from '../../src/modulos/usuarios/repositorio';
import router from '../../src/routes/publica';
import { criarApp } from '../helpers/app';
import { DOC_MOCK } from '../helpers/fixtures';

const mockCert = repositorioCert as jest.Mocked<typeof repositorioCert>;
const mockDoc = repositorioDoc as jest.Mocked<typeof repositorioDoc>;
const mockUsr = repositorioUsr as jest.Mocked<typeof repositorioUsr>;

const app = criarApp(router);

const CERT_MOCK = {
  id: 'cert-1',
  documento_id: 'doc-1',
  estudante_id: 'est-1',
  hash: 'a'.repeat(64),
  caminho_arquivo: 'certificados/doc-1/aaaa.pdf',
  criado_em: new Date(),
};

const USUARIO_MOCK = {
  id: 'est-1',
  nome: 'João Silva',
  email: 'joao@uni.edu',
  matricula: '2021001',
  cpf: null,
  endereco: null,
  perfil: 'estudante' as const,
  curso_id: 'curso-1',
  instituicao_id: 'inst-1',
  instituicao_nome: 'Universidade Teste',
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
};

// ─────────────────────────────────────────────
// GET /verificar/:hash
// ─────────────────────────────────────────────
describe('GET /verificar/:hash', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 com valido=true e dados do certificado, documento e estudante', async () => {
    mockCert.buscarPorHash.mockResolvedValueOnce(CERT_MOCK);
    mockDoc.buscarPorId.mockResolvedValueOnce({ ...DOC_MOCK, status: 'aprovado' });
    mockUsr.buscarPorId.mockResolvedValueOnce(USUARIO_MOCK);

    const res = await request(app).get(`/verificar/${'a'.repeat(64)}`);
    expect(res.status).toBe(200);
    expect(res.body.valido).toBe(true);
    expect(res.body.certificado.id).toBe('cert-1');
    expect(res.body.documento.titulo).toBe('Certificado XYZ');
    expect(res.body.estudante.nome).toBe('João Silva');
  });

  it('retorna 404 com valido=false quando hash não é encontrado', async () => {
    mockCert.buscarPorHash.mockResolvedValueOnce(null);

    const res = await request(app).get('/verificar/hash-invalido');
    expect(res.status).toBe(404);
    expect(res.body.valido).toBe(false);
    expect(res.body.erro).toContain('não encontrado');
  });

  it('retorna documento e estudante como null quando não são encontrados', async () => {
    mockCert.buscarPorHash.mockResolvedValueOnce(CERT_MOCK);
    mockDoc.buscarPorId.mockResolvedValueOnce(null);
    mockUsr.buscarPorId.mockResolvedValueOnce(null);

    const res = await request(app).get(`/verificar/${'a'.repeat(64)}`);
    expect(res.status).toBe(200);
    expect(res.body.valido).toBe(true);
    expect(res.body.documento).toBeNull();
    expect(res.body.estudante).toBeNull();
  });

  it('retorna 500 quando o repositório lança erro', async () => {
    mockCert.buscarPorHash.mockRejectedValueOnce(new Error('Falha DB'));

    const res = await request(app).get('/verificar/qualquer-hash');
    expect(res.status).toBe(500);
  });

  it('não expõe campos sensíveis do estudante (senha, matricula)', async () => {
    mockCert.buscarPorHash.mockResolvedValueOnce(CERT_MOCK);
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockUsr.buscarPorId.mockResolvedValueOnce(USUARIO_MOCK);

    const res = await request(app).get(`/verificar/${'a'.repeat(64)}`);
    expect(res.body.estudante.matricula).toBeUndefined();
    expect(res.body.estudante.ativo).toBeUndefined();
    expect(res.body.estudante.nome).toBeDefined();
    expect(res.body.estudante.email).toBeDefined();
  });
});
