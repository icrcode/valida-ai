const mockSend = jest.fn();
const mockGetSignedUrl = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'PutObject' })),
  DeleteObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'DeleteObject' })),
  HeadBucketCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'HeadBucket' })),
  GetObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'GetObject' })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

jest.mock('../../../src/configuracao', () => ({
  configuracao: {
    s3: {
      regiao: 'sa-east-1',
      chaveAcesso: 'test-access-key',
      chaveSecreta: 'test-secret-key',
      balde: 'test-bucket',
      baldeCertificados: 'test-cert-bucket',
      endpoint: undefined,
      forcarCaminhoEstilo: false,
    },
    nivelLog: 'info',
  },
}));

jest.mock('../../../src/utils/registrador', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  garantirBalde,
  garantirBaldeCertificados,
  fazerUpload,
  gerarUrlAssinada,
  deletarArquivo,
  fazerUploadCertificado,
  gerarUrlAssinadaCertificado,
} from '../../../src/servicos/armazenamento';

describe('garantirBalde', () => {
  it('resolve sem erros quando bucket está acessível', async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(garantirBalde()).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(1);
    mockSend.mockClear();
  });

  it('resolve sem erros mesmo quando bucket não está acessível (swallows error)', async () => {
    mockSend.mockRejectedValueOnce(new Error('NoSuchBucket'));
    await expect(garantirBalde()).resolves.toBeUndefined();
    mockSend.mockClear();
  });
});

describe('garantirBaldeCertificados', () => {
  it('resolve sem erros quando bucket de certificados está acessível', async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(garantirBaldeCertificados()).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(1);
    mockSend.mockClear();
  });

  it('resolve sem erros mesmo quando bucket de certificados não está acessível', async () => {
    mockSend.mockRejectedValueOnce(new Error('AccessDenied'));
    await expect(garantirBaldeCertificados()).resolves.toBeUndefined();
    mockSend.mockClear();
  });
});

describe('fazerUpload', () => {
  afterEach(() => mockSend.mockClear());

  it('envia PutObjectCommand e retorna a chave do arquivo', async () => {
    mockSend.mockResolvedValueOnce({});
    const buffer = Buffer.from('conteudo do arquivo');
    const resultado = await fazerUpload(buffer, 'documentos/arquivo.pdf', 'application/pdf');
    expect(resultado).toBe('documentos/arquivo.pdf');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('propaga erro quando o upload falha', async () => {
    mockSend.mockRejectedValueOnce(new Error('S3 upload error'));
    await expect(fazerUpload(Buffer.from('dados'), 'key.pdf', 'application/pdf')).rejects.toThrow('S3 upload error');
  });
});

describe('gerarUrlAssinada', () => {
  afterEach(() => mockGetSignedUrl.mockClear());

  it('retorna URL assinada para o arquivo no balde padrão', async () => {
    mockGetSignedUrl.mockResolvedValueOnce('https://s3.amazonaws.com/test-bucket/arquivo.pdf?signed');
    const url = await gerarUrlAssinada('documentos/arquivo.pdf');
    expect(url).toContain('https://');
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('usa expiração customizada quando fornecida', async () => {
    mockGetSignedUrl.mockResolvedValueOnce('https://signed.com');
    await gerarUrlAssinada('arquivo.pdf', 7200);
    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options.expiresIn).toBe(7200);
  });

  it('usa expiração padrão de 3600 segundos quando não fornecida', async () => {
    mockGetSignedUrl.mockResolvedValueOnce('https://signed.com');
    await gerarUrlAssinada('arquivo.pdf');
    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options.expiresIn).toBe(3600);
  });
});

describe('deletarArquivo', () => {
  afterEach(() => mockSend.mockClear());

  it('envia DeleteObjectCommand para o arquivo', async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(deletarArquivo('documentos/arquivo-antigo.pdf')).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('propaga erro quando a deleção falha', async () => {
    mockSend.mockRejectedValueOnce(new Error('NoSuchKey'));
    await expect(deletarArquivo('chave-inexistente.pdf')).rejects.toThrow('NoSuchKey');
  });
});

describe('fazerUploadCertificado', () => {
  afterEach(() => mockSend.mockClear());

  it('envia PutObjectCommand ao balde de certificados e retorna a chave', async () => {
    mockSend.mockResolvedValueOnce({});
    const buffer = Buffer.from('PDF content');
    const resultado = await fazerUploadCertificado(buffer, 'certificados/cert-123.pdf');
    expect(resultado).toBe('certificados/cert-123.pdf');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('propaga erro quando o upload do certificado falha', async () => {
    mockSend.mockRejectedValueOnce(new Error('BucketNotFound'));
    await expect(fazerUploadCertificado(Buffer.from('x'), 'cert.pdf')).rejects.toThrow('BucketNotFound');
  });
});

describe('gerarUrlAssinadaCertificado', () => {
  afterEach(() => mockGetSignedUrl.mockClear());

  it('retorna URL assinada do balde de certificados', async () => {
    mockGetSignedUrl.mockResolvedValueOnce('https://s3.amazonaws.com/test-cert-bucket/cert.pdf?signed');
    const url = await gerarUrlAssinadaCertificado('certificados/cert-123.pdf');
    expect(url).toContain('https://');
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('usa expiração padrão de 3600 quando não fornecida', async () => {
    mockGetSignedUrl.mockResolvedValueOnce('https://signed.com');
    await gerarUrlAssinadaCertificado('cert.pdf');
    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options.expiresIn).toBe(3600);
  });

  it('usa expiração customizada quando fornecida', async () => {
    mockGetSignedUrl.mockResolvedValueOnce('https://signed.com');
    await gerarUrlAssinadaCertificado('cert.pdf', 1800);
    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options.expiresIn).toBe(1800);
  });
});
