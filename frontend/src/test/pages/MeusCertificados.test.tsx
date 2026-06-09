import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, USUARIO_ESTUDANTE } from '../helpers/renderWithProviders';
import { MeusCertificados } from '../../pages/MeusCertificados';

const mockCertificadosService = vi.hoisted(() => ({
  listar: vi.fn(),
  buscarUrlDownload: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock('../../services/certificados', () => ({
  certificadosService: mockCertificadosService,
}));

const CERT_MOCK = {
  id: 'cert-1',
  documento_id: 'doc-1',
  estudante_id: 'u-1',
  hash: 'abc123hash',
  caminho_arquivo: 'certs/cert-1.pdf',
  criado_em: '2024-03-01T10:00:00Z',
  documento: {
    id: 'doc-1', titulo: 'Workshop React', tipo: 'extensao', carga_horaria: 40,
    estudante_id: 'u-1', curso_id: 'c-1', status: 'aprovado' as const,
    coordenador_id: 'coord-1', nome_arquivo: 'cert.pdf', caminho_arquivo: 'docs/cert.pdf',
    tamanho_arquivo: 1024, mime_type: 'application/pdf',
    criado_em: '2024-01-15T10:00:00Z', atualizado_em: '2024-01-20T10:00:00Z',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCertificadosService.listar.mockResolvedValue([CERT_MOCK]);
});

describe('MeusCertificados — estados básicos', () => {
  it('exibe o título Meus Certificados', async () => {
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    expect(screen.getByText('Meus Certificados')).toBeInTheDocument();
  });

  it('exibe spinner durante carregamento', () => {
    mockCertificadosService.listar.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    expect(container).toBeTruthy();
  });

  it('exibe mensagem de erro quando listar falha', async () => {
    mockCertificadosService.listar.mockRejectedValue(new Error('Erro de rede'));
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar certificados/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem quando lista está vazia', async () => {
    mockCertificadosService.listar.mockResolvedValue([]);
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText(/Você ainda não possui certificados/i)).toBeInTheDocument();
    });
  });
});

describe('MeusCertificados — com certificados', () => {
  it('renderiza o título do documento do certificado', async () => {
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Workshop React')).toBeInTheDocument();
    });
  });

  it('renderiza tipo e carga horária do documento', async () => {
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText(/Extensão/i)).toBeInTheDocument();
      expect(screen.getByText(/40h/i)).toBeInTheDocument();
    });
  });

  it('renderiza badge Emitido', async () => {
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Emitido')).toBeInTheDocument();
    });
  });

  it('renderiza data de emissão', async () => {
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText(/Emitido em/i)).toBeInTheDocument();
    });
  });

  it('renderiza botão Baixar PDF', async () => {
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Baixar PDF')).toBeInTheDocument();
    });
  });

  it('renderiza link de verificação pública', async () => {
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      const link = screen.getByText(/Ver verificação pública/i);
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/verificar/abc123hash');
    });
  });

  it('clica em Baixar PDF e chama buscarUrlDownload', async () => {
    mockCertificadosService.buscarUrlDownload.mockResolvedValue({ url: 'https://s3.test/cert.pdf', expira_em: '2024-04-01' });
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByText('Baixar PDF'));
    fireEvent.click(screen.getByText('Baixar PDF'));
    await waitFor(() => expect(mockCertificadosService.buscarUrlDownload).toHaveBeenCalledWith('cert-1'));
  });

  it('renderiza múltiplos certificados', async () => {
    const cert2 = { ...CERT_MOCK, id: 'cert-2', hash: 'def456', documento: { ...CERT_MOCK.documento, titulo: 'Curso Python' } };
    mockCertificadosService.listar.mockResolvedValue([CERT_MOCK, cert2]);
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Workshop React')).toBeInTheDocument();
      expect(screen.getByText('Curso Python')).toBeInTheDocument();
    });
  });

  it('certificado sem documento renderiza sem erro', async () => {
    const certSemDoc = { ...CERT_MOCK, documento: null };
    mockCertificadosService.listar.mockResolvedValue([certSemDoc]);
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Baixar PDF')).toBeInTheDocument();
    });
  });

  it('usa tipo bruto como fallback quando tipo não está em TIPO_LEGIVEL', async () => {
    const certTipoDesconhecido = {
      ...CERT_MOCK,
      documento: { ...CERT_MOCK.documento, tipo: 'certificado_curso' },
    };
    mockCertificadosService.listar.mockResolvedValue([certTipoDesconhecido]);
    renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText(/certificado_curso/)).toBeInTheDocument();
    });
  });

  it('aplica delay-300 para o 5º certificado ou mais', async () => {
    const certs = Array.from({ length: 5 }, (_, i) => ({
      ...CERT_MOCK,
      id: `cert-${i + 1}`,
      hash: `hash${i}`,
      documento: { ...CERT_MOCK.documento, titulo: `Curso ${i}` },
    }));
    mockCertificadosService.listar.mockResolvedValue(certs);
    const { container } = renderWithProviders(<MeusCertificados />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByText('Curso 4'));
    expect(container.querySelector('.delay-300')).toBeInTheDocument();
  });
});
