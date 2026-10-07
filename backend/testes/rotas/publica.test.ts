import request from 'supertest';

jest.mock('../../src/modulos/certificados/repositorio');
jest.mock('../../src/modulos/documentos/repositorio');
jest.mock('../../src/modulos/usuarios/repositorio');
jest.mock('../../src/blockchain/servico');

import * as repositorioCert from '../../src/modulos/certificados/repositorio';
import * as repositorioDoc from '../../src/modulos/documentos/repositorio';
import * as repositorioUsr from '../../src/modulos/usuarios/repositorio';
import * as servicoBlockchain from '../../src/blockchain/servico';
import router from '../../src/routes/publica';
import { criarApp } from '../helpers/app';
import { DOC_MOCK } from '../helpers/fixtures';

const mockCert = repositorioCert as jest.Mocked<typeof repositorioCert>;
const mockDoc = repositorioDoc as jest.Mocked<typeof repositorioDoc>;
const mockUsr = repositorioUsr as jest.Mocked<typeof repositorioUsr>;
const mockBlockchain = servicoBlockchain as jest.Mocked<typeof servicoBlockchain>;

const app = criarApp(router);

// Por padrão, documento sem registros na blockchain
beforeEach(() => mockBlockchain.historicoDocumento.mockResolvedValue([]));

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

// ─────────────────────────────────────────────
// Ancoragem na blockchain
// ─────────────────────────────────────────────
describe('GET /verificar/:hash — blockchain', () => {
  beforeEach(() => jest.clearAllMocks());

  const provaCertificado = (codigo: string, provaValida = true) => ({
    transacao: {
      id: 'f'.repeat(64),
      tipo: 'CERTIFICADO_EMITIDO' as const,
      documentoId: 'doc-1',
      hashArquivo: 'e'.repeat(64),
      dados: { codigoVerificacao: codigo },
      timestamp: new Date().toISOString(),
      sal: '00',
    },
    bloco: {
      altura: 4,
      hash: '000' + 'c'.repeat(61),
      hashAnterior: '000' + 'd'.repeat(61),
      raizMerkle: 'f'.repeat(64),
      timestamp: new Date().toISOString(),
      validador: 'chave',
      assinatura: 'sig',
    },
    provaMerkle: [],
    provaValida,
    confirmacoes: 2,
  });

  it('marca ancorado=true quando o certificado está gravado na cadeia', async () => {
    mockCert.buscarPorHash.mockResolvedValueOnce(CERT_MOCK);
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockUsr.buscarPorId.mockResolvedValueOnce(USUARIO_MOCK);
    mockBlockchain.historicoDocumento.mockResolvedValueOnce([provaCertificado(CERT_MOCK.hash)]);

    const res = await request(app).get(`/verificar/${CERT_MOCK.hash}`);
    expect(res.body.blockchain.disponivel).toBe(true);
    expect(res.body.blockchain.ancorado).toBe(true);
    expect(res.body.blockchain.linhaDoTempo[0].bloco).toBe(4);
  });

  it('marca ancorado=false quando o código não confere com a cadeia', async () => {
    mockCert.buscarPorHash.mockResolvedValueOnce(CERT_MOCK);
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockUsr.buscarPorId.mockResolvedValueOnce(USUARIO_MOCK);
    mockBlockchain.historicoDocumento.mockResolvedValueOnce([provaCertificado('outro-codigo')]);

    const res = await request(app).get(`/verificar/${CERT_MOCK.hash}`);
    expect(res.body.valido).toBe(true);
    expect(res.body.blockchain.ancorado).toBe(false);
  });

  it('continua respondendo quando a blockchain está indisponível', async () => {
    mockCert.buscarPorHash.mockResolvedValueOnce(CERT_MOCK);
    mockDoc.buscarPorId.mockResolvedValueOnce(DOC_MOCK);
    mockUsr.buscarPorId.mockResolvedValueOnce(USUARIO_MOCK);
    mockBlockchain.historicoDocumento.mockRejectedValueOnce(new Error('sem tabelas'));

    const res = await request(app).get(`/verificar/${CERT_MOCK.hash}`);
    expect(res.status).toBe(200);
    expect(res.body.blockchain).toEqual({ disponivel: false });
  });
});
