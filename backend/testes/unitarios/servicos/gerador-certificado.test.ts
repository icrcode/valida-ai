jest.mock('../../../src/servicos/armazenamento', () => ({
  fazerUploadCertificado: jest.fn(),
}));
jest.mock('../../../src/utils/registrador', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import * as armazenamento from '../../../src/servicos/armazenamento';
import {
  gerarHash,
  gerarPDF,
  gerarEArmazenarCertificado,
  DadosCertificado,
} from '../../../src/servicos/gerador-certificado';

const mockArm = armazenamento as jest.Mocked<typeof armazenamento>;

const DADOS_BASE: DadosCertificado = {
  documentoId: 'doc-1',
  estudanteNome: 'João Silva',
  estudanteEmail: 'joao@uni.edu',
  coordenadorNome: 'Maria Coordenadora',
  titulo: 'Certificado XYZ',
  tipo: 'certificado_curso',
  cargaHoraria: 40,
  dataAprovacao: new Date('2024-06-01'),
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// gerarHash
// ─────────────────────────────────────────────
describe('gerarHash', () => {
  it('retorna uma string hex de 64 caracteres (SHA-256)', () => {
    const hash = gerarHash('doc-1');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('gera hashes distintos para o mesmo documentoId (por aleatoriedade)', () => {
    const h1 = gerarHash('doc-1');
    const h2 = gerarHash('doc-1');
    expect(h1).not.toBe(h2);
  });
});

// ─────────────────────────────────────────────
// gerarPDF
// ─────────────────────────────────────────────
describe('gerarPDF', () => {
  it('retorna um Buffer com bytes de PDF', async () => {
    const buffer = await gerarPDF(DADOS_BASE, 'http://localhost:3000/api/publica/verificar/abc123');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('o PDF começa com a assinatura %PDF', async () => {
    const buffer = await gerarPDF(DADOS_BASE, 'http://localhost:3000/api/publica/verificar/abc123');
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('gera PDF para tipo desconhecido sem erros', async () => {
    const dados = { ...DADOS_BASE, tipo: 'outro' };
    await expect(gerarPDF(dados, 'http://localhost:3000/verificar/x')).resolves.toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// gerarEArmazenarCertificado
// ─────────────────────────────────────────────
describe('gerarEArmazenarCertificado', () => {
  beforeEach(() => {
    mockArm.fazerUploadCertificado.mockResolvedValue('certificados/doc-1/abc.pdf');
  });

  it('retorna hash, caminhoArquivo e pdfBuffer', async () => {
    const resultado = await gerarEArmazenarCertificado(DADOS_BASE, 'http://localhost:3000');

    expect(resultado.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(resultado.caminhoArquivo).toContain('certificados/doc-1/');
    expect(resultado.caminhoArquivo).toContain('.pdf');
    expect(Buffer.isBuffer(resultado.pdfBuffer)).toBe(true);
  });

  it('chama fazerUploadCertificado com a chave correta', async () => {
    const resultado = await gerarEArmazenarCertificado(DADOS_BASE, 'http://localhost:3000');

    expect(mockArm.fazerUploadCertificado).toHaveBeenCalledTimes(1);
    expect(mockArm.fazerUploadCertificado).toHaveBeenCalledWith(
      expect.any(Buffer),
      resultado.caminhoArquivo,
    );
  });

  it('propaga erro quando o upload falha', async () => {
    mockArm.fazerUploadCertificado.mockRejectedValueOnce(new Error('MinIO indisponível'));

    await expect(
      gerarEArmazenarCertificado(DADOS_BASE, 'http://localhost:3000'),
    ).rejects.toThrow('MinIO indisponível');
  });
});
