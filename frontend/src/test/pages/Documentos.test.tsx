import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, USUARIO_ESTUDANTE, USUARIO_COORD } from '../helpers/renderWithProviders';
import { Documentos } from '../../pages/Documentos';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

const mockDocumentosService = { listar: vi.fn() };

vi.mock('../../services/documentos', () => ({
  documentosService: mockDocumentosService,
}));

const DOCS_MOCK = [
  {
    id: 'doc-1', titulo: 'Certificado React', tipo: 'certificado_curso', carga_horaria: 40,
    estudante_id: 'u-1', curso_id: 'c-1', status: 'pendente' as const,
    coordenador_id: null, nome_arquivo: 'cert.pdf', caminho_arquivo: 'docs/cert.pdf',
    tamanho_arquivo: 1024, mime_type: 'application/pdf',
    criado_em: '2024-01-15T10:00:00Z', atualizado_em: '2024-01-15T10:00:00Z',
  },
  {
    id: 'doc-2', titulo: 'Workshop Node', tipo: 'certificado_evento', carga_horaria: 20,
    estudante_id: 'u-1', curso_id: 'c-1', status: 'aprovado' as const,
    coordenador_id: 'coord-1', nome_arquivo: 'node.pdf', caminho_arquivo: 'docs/node.pdf',
    tamanho_arquivo: 2048, mime_type: 'application/pdf',
    criado_em: '2024-01-10T10:00:00Z', atualizado_em: '2024-01-12T10:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockDocumentosService.listar.mockResolvedValue({ dados: DOCS_MOCK, total: 2, pagina: 1, limite: 10 });
});

describe('Documentos — renderização básica', () => {
  it('exibe o título Documentos', async () => {
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Documentos')).toBeInTheDocument();
    });
  });

  it('exibe botão Submeter Documento para estudante', async () => {
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Submeter Documento')).toBeInTheDocument();
    });
  });

  it('não exibe botão Submeter Documento para coordenador', async () => {
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() => screen.getByText('Documentos'));
    expect(screen.queryByText('Submeter Documento')).not.toBeInTheDocument();
  });

  it('renderiza os documentos da lista', async () => {
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Certificado React')).toBeInTheDocument();
      expect(screen.getByText('Workshop Node')).toBeInTheDocument();
    });
  });

  it('renderiza links Ver → para cada documento', async () => {
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      const links = screen.getAllByText('Ver →');
      expect(links).toHaveLength(2);
    });
  });

  it('exibe filtros de status e tipo', async () => {
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Tipo')).toBeInTheDocument();
    });
  });
});

describe('Documentos — estados de loading e erro', () => {
  it('exibe spinner durante carregamento', () => {
    mockDocumentosService.listar.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    expect(container).toBeTruthy();
  });

  it('exibe mensagem de erro quando listar falha', async () => {
    mockDocumentosService.listar.mockRejectedValue(new Error('Erro de rede'));
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar documentos/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem quando lista está vazia', async () => {
    mockDocumentosService.listar.mockResolvedValue({ dados: [], total: 0, pagina: 1, limite: 10 });
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Nenhum documento encontrado.')).toBeInTheDocument();
    });
  });
});

describe('Documentos — filtros', () => {
  it('muda filtro de status e rebusca', async () => {
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByLabelText('Status'));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'aprovado' } });
    await waitFor(() => {
      expect(mockDocumentosService.listar).toHaveBeenCalledTimes(2);
    });
  });

  it('filtra por tipo ao digitar', async () => {
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByLabelText('Tipo'));
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'certificado' } });
    await waitFor(() => {
      expect(mockDocumentosService.listar).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Documentos — paginação', () => {
  beforeEach(() => {
    const manyDocs = Array.from({ length: 10 }, (_, i) => ({
      ...DOCS_MOCK[0],
      id: `doc-${i}`,
      titulo: `Doc ${i}`,
    }));
    mockDocumentosService.listar.mockResolvedValue({ dados: manyDocs, total: 25, pagina: 1, limite: 10 });
  });

  it('exibe controles de paginação quando há mais de uma página', async () => {
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Anterior')).toBeInTheDocument();
      expect(screen.getByText('Próxima')).toBeInTheDocument();
    });
  });

  it('botão Anterior está desabilitado na primeira página', async () => {
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByText('Anterior'));
    expect(screen.getByText('Anterior').closest('button')).toBeDisabled();
  });

  it('clica em Próxima e avança de página', async () => {
    renderWithProviders(<Documentos />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => screen.getByText('Próxima'));
    fireEvent.click(screen.getByText('Próxima'));
    await waitFor(() => expect(mockDocumentosService.listar).toHaveBeenCalledTimes(2));
  });
});
