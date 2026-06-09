import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, USUARIO_ESTUDANTE, USUARIO_COORD, USUARIO_ADMIN } from '../helpers/renderWithProviders';
import { Dashboard } from '../../pages/Dashboard';

const { mockDocumentosService } = vi.hoisted(() => ({
  mockDocumentosService: { listar: vi.fn() },
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock('../../services/documentos', () => ({
  documentosService: mockDocumentosService,
}));

const RESPOSTA_VAZIA = { total: 0, dados: [], pagina: 1, total_paginas: 1 };

const DOCS_MOCK = {
  total: 2,
  pagina: 1,
  total_paginas: 1,
  dados: [
    {
      id: 'd-1', titulo: 'Certificado de Python', tipo: 'certificado_curso',
      carga_horaria: 40, status: 'pendente',
      estudante_id: 'u-1', estudante_nome: 'João',
      criado_em: '2024-01-15T10:00:00Z', atualizado_em: '2024-01-15T10:00:00Z',
      arquivo_url: null, observacoes: null, curso_id: null, instituicao_id: null,
    },
    {
      id: 'd-2', titulo: 'Artigo de Pesquisa', tipo: 'artigo_publicado',
      carga_horaria: 20, status: 'aprovado',
      estudante_id: 'u-1', estudante_nome: 'João',
      criado_em: '2024-02-10T08:00:00Z', atualizado_em: '2024-02-10T08:00:00Z',
      arquivo_url: null, observacoes: null, curso_id: null, instituicao_id: null,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockDocumentosService.listar.mockResolvedValue(RESPOSTA_VAZIA);
});

describe('Dashboard — estudante', () => {
  it('renderiza a página sem erros', () => {
    const { container } = renderWithProviders(<Dashboard />, {
      token: 'tok-123', usuario: USUARIO_ESTUDANTE,
    });
    expect(container).toBeTruthy();
  });

  it('exibe o primeiro nome do usuário', async () => {
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => expect(screen.getByText(/João/)).toBeInTheDocument());
  });

  it('exibe texto para estudante', async () => {
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() =>
      expect(screen.getByText(/Acompanhe o status dos seus documentos/)).toBeInTheDocument(),
    );
  });

  it('exibe link Submeter Documento para estudante', async () => {
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() =>
      expect(screen.getByText('Submeter Documento')).toBeInTheDocument(),
    );
  });

  it('exibe link Meus Certificados para estudante', async () => {
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() =>
      expect(screen.getByText('Meus Certificados')).toBeInTheDocument(),
    );
  });

  it('exibe mensagem quando não há documentos recentes', async () => {
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() =>
      expect(screen.getByText('Nenhum documento encontrado.')).toBeInTheDocument(),
    );
  });

  it('exibe documentos recentes quando há dados', async () => {
    mockDocumentosService.listar.mockResolvedValue(DOCS_MOCK);
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      expect(screen.getByText('Certificado de Python')).toBeInTheDocument();
      expect(screen.getByText('Artigo de Pesquisa')).toBeInTheDocument();
    });
  });

  it('exibe link Ver para cada documento recente', async () => {
    mockDocumentosService.listar.mockResolvedValue(DOCS_MOCK);
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
    await waitFor(() => {
      const links = screen.getAllByText('Ver');
      expect(links.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('Dashboard — coordenador/admin', () => {
  it('exibe texto de coordenador/admin', async () => {
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() =>
      expect(screen.getByText(/Visão geral dos documentos do seu curso/)).toBeInTheDocument(),
    );
  });

  it('exibe link Fila de Análise para coordenador', async () => {
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() =>
      expect(screen.getByText('Fila de Análise')).toBeInTheDocument(),
    );
  });

  it('não exibe link Submeter Documento para coordenador', async () => {
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() => screen.getByText(/Visão geral/));
    expect(screen.queryByText('Submeter Documento')).not.toBeInTheDocument();
  });

  it('exibe texto correto para admin', async () => {
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_ADMIN });
    await waitFor(() =>
      expect(screen.getByText(/Visão geral dos documentos do seu curso/)).toBeInTheDocument(),
    );
  });

  it('exibe cards de status para coordenador', async () => {
    renderWithProviders(<Dashboard />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() => {
      expect(screen.getByText('Pendentes')).toBeInTheDocument();
      expect(screen.getByText('Em Revisão')).toBeInTheDocument();
    });
  });
});
