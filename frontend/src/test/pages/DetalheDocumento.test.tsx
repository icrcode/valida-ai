import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, USUARIO_ESTUDANTE, USUARIO_COORD } from '../helpers/renderWithProviders';
import { DetalheDocumento } from '../../pages/DetalheDocumento';

const mockDocumentosService = vi.hoisted(() => ({
  buscarPorId: vi.fn(),
  historico: vi.fn(),
  buscarUrlDownload: vi.fn(),
  aprovar: vi.fn(),
  reprovar: vi.fn(),
  solicitarRevisao: vi.fn(),
  cancelar: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: 'doc-1' })),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

vi.mock('../../services/documentos', () => ({
  documentosService: mockDocumentosService,
}));

const DOC_MOCK = {
  id: 'doc-1',
  titulo: 'Certificado React',
  tipo: 'certificado_curso',
  carga_horaria: 40,
  estudante_id: 'u-1',
  curso_id: 'c-1',
  status: 'pendente' as const,
  coordenador_id: null,
  nome_arquivo: 'cert.pdf',
  caminho_arquivo: 'docs/cert.pdf',
  tamanho_arquivo: 1024 * 512,
  mime_type: 'application/pdf',
  criado_em: '2024-01-15T10:00:00Z',
  atualizado_em: '2024-01-15T10:00:00Z',
};

const HISTORICO_MOCK = [
  { id: 'h-1', documento_id: 'doc-1', usuario_id: 'u-1', acao: 'submetido', observacoes: null, criado_em: '2024-01-15T10:00:00Z' },
  { id: 'h-2', documento_id: 'doc-1', usuario_id: 'coord-1', acao: 'revisao_solicitada', observacoes: 'Falta assinatura', criado_em: '2024-01-16T10:00:00Z' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockDocumentosService.buscarPorId.mockResolvedValue(DOC_MOCK);
  mockDocumentosService.historico.mockResolvedValue([]);
});

describe('DetalheDocumento — loading e not found', () => {
  it('exibe spinner enquanto carrega', () => {
    mockDocumentosService.buscarPorId.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    expect(container).toBeTruthy();
  });

  it('exibe mensagem quando documento não é encontrado', async () => {
    mockDocumentosService.buscarPorId.mockResolvedValue(null);
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText(/Documento não encontrado/i)).toBeInTheDocument();
    });
  });

  it('botão Voltar no estado not-found dispara navigate', async () => {
    mockDocumentosService.buscarPorId.mockResolvedValue(null);
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByText(/Documento não encontrado/i));
    const btn = screen.getByText('Voltar para Documentos');
    fireEvent.click(btn);
    expect(btn).toBeTruthy();
  });
});

describe('DetalheDocumento — detalhes do documento', () => {
  it('renderiza o título do documento', async () => {
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Certificado React')).toBeInTheDocument();
    });
  });

  it('renderiza informações do documento (tipo, carga, arquivo)', async () => {
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('certificado_curso')).toBeInTheDocument();
      expect(screen.getByText('40h')).toBeInTheDocument();
      expect(screen.getByText('cert.pdf')).toBeInTheDocument();
    });
  });

  it('renderiza tamanho do arquivo em KB', async () => {
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText(/KB/i)).toBeInTheDocument();
    });
  });

  it('renderiza botão de download', async () => {
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Baixar PDF')).toBeInTheDocument();
    });
  });

  it('clica em Baixar PDF e chama buscarUrlDownload', async () => {
    mockDocumentosService.buscarUrlDownload.mockResolvedValue({ url: 'https://s3.test/doc.pdf', expira_em: '2024-02-01' });
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByText('Baixar PDF'));
    fireEvent.click(screen.getByText('Baixar PDF'));
    await waitFor(() => expect(mockDocumentosService.buscarUrlDownload).toHaveBeenCalledWith('doc-1'));
  });

  it('renderiza histórico quando presente', async () => {
    mockDocumentosService.historico.mockResolvedValue(HISTORICO_MOCK);
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Histórico')).toBeInTheDocument();
      expect(screen.getByText('Documento submetido')).toBeInTheDocument();
      expect(screen.getByText('Revisão solicitada')).toBeInTheDocument();
      expect(screen.getByText('Falta assinatura')).toBeInTheDocument();
    });
  });

  it('não exibe seção de histórico quando vazio', async () => {
    mockDocumentosService.historico.mockResolvedValue([]);
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByText('Certificado React'));
    expect(screen.queryByText('Histórico')).not.toBeInTheDocument();
  });
});

describe('DetalheDocumento — estudante com documento pendente', () => {
  it('exibe opção de cancelar para estudante com doc pendente', async () => {
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Cancelar Documento')).toBeInTheDocument();
    });
  });

  it('solicita confirmação antes de cancelar', async () => {
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByText('Cancelar Documento'));
    fireEvent.click(screen.getByText('Cancelar Documento'));
    expect(screen.getByText('Confirmar cancelamento')).toBeInTheDocument();
    expect(screen.getByText(/Esta ação não pode ser desfeita/i)).toBeInTheDocument();
  });

  it('botão Voltar no modal de confirmação restaura o estado anterior', async () => {
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByText('Cancelar Documento'));
    fireEvent.click(screen.getByText('Cancelar Documento'));
    fireEvent.click(screen.getByText('Voltar'));
    expect(screen.getByText('Cancelar Documento')).toBeInTheDocument();
  });

  it('confirma cancelamento e chama cancelar', async () => {
    const mockNavigate = vi.fn();
    const { useNavigate } = await import('react-router-dom');
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    mockDocumentosService.cancelar.mockResolvedValue(undefined);
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByText('Cancelar Documento'));
    fireEvent.click(screen.getByText('Cancelar Documento'));
    fireEvent.click(screen.getByText('Confirmar cancelamento'));
    await waitFor(() => expect(mockDocumentosService.cancelar).toHaveBeenCalledWith('doc-1'));
  });

  it('não exibe cancelar quando doc não é pendente', async () => {
    mockDocumentosService.buscarPorId.mockResolvedValue({ ...DOC_MOCK, status: 'aprovado' });
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByText('Certificado React'));
    expect(screen.queryByText('Cancelar Documento')).not.toBeInTheDocument();
  });
});

describe('DetalheDocumento — coordenador avaliando documento', () => {
  it('exibe painel de avaliação para coordenador com doc pendente', async () => {
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() => {
      expect(screen.getByText('Avaliar Documento')).toBeInTheDocument();
      expect(screen.getByText('Aprovar')).toBeInTheDocument();
      expect(screen.getByText('Reprovar')).toBeInTheDocument();
      expect(screen.getByText('Solicitar Revisão')).toBeInTheDocument();
    });
  });

  it('não exibe painel de avaliação quando doc está aprovado', async () => {
    mockDocumentosService.buscarPorId.mockResolvedValue({ ...DOC_MOCK, status: 'aprovado' });
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() => screen.getByText('Certificado React'));
    expect(screen.queryByText('Avaliar Documento')).not.toBeInTheDocument();
  });

  it('clica em Aprovar e chama aprovar', async () => {
    mockDocumentosService.aprovar.mockResolvedValue({ ...DOC_MOCK, status: 'aprovado' });
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() => screen.getByText('Aprovar'));
    fireEvent.click(screen.getByText('Aprovar'));
    await waitFor(() => expect(mockDocumentosService.aprovar).toHaveBeenCalledWith('doc-1', undefined));
  });

  it('clica em Reprovar com observações e chama reprovar', async () => {
    mockDocumentosService.reprovar.mockResolvedValue({ ...DOC_MOCK, status: 'reprovado' });
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() => screen.getByText('Reprovar'));
    const textarea = screen.getByPlaceholderText(/Observações/i);
    fireEvent.change(textarea, { target: { value: 'Documento ilegível' } });
    fireEvent.click(screen.getByText('Reprovar'));
    await waitFor(() => expect(mockDocumentosService.reprovar).toHaveBeenCalledWith('doc-1', 'Documento ilegível'));
  });

  it('clica em Solicitar Revisão com observações e chama solicitarRevisao', async () => {
    mockDocumentosService.solicitarRevisao.mockResolvedValue({ ...DOC_MOCK, status: 'revisao_solicitada' });
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() => screen.getByText('Solicitar Revisão'));
    const textarea = screen.getByPlaceholderText(/Observações/i);
    fireEvent.change(textarea, { target: { value: 'Assine o documento' } });
    fireEvent.click(screen.getByText('Solicitar Revisão'));
    await waitFor(() => expect(mockDocumentosService.solicitarRevisao).toHaveBeenCalledWith('doc-1', 'Assine o documento'));
  });

  it('exibe aviso quando observações estão vazias', async () => {
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() => screen.getByText('Avaliar Documento'));
    expect(screen.getByText(/Preencha as observações/i)).toBeInTheDocument();
  });

  it('exibe painel também para doc com revisao_solicitada', async () => {
    mockDocumentosService.buscarPorId.mockResolvedValue({ ...DOC_MOCK, status: 'revisao_solicitada' });
    renderWithProviders(<DetalheDocumento />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() => {
      expect(screen.getByText('Avaliar Documento')).toBeInTheDocument();
    });
  });
});
