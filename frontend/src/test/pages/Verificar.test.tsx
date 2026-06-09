import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Verificar } from '../../pages/Verificar';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isAxiosError: vi.fn(),
    create: vi.fn(),
  },
}));

const mockAxios = vi.mocked(axios);

function renderVerificar(hash?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[hash ? `/verificar/${hash}` : '/verificar']}>
        <Routes>
          <Route path="/verificar/:hash" element={<Verificar />} />
          <Route path="/verificar" element={<Verificar />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAxios.isAxiosError.mockReturnValue(false);
});

describe('Verificar — estados da página', () => {
  it('renderiza o cabeçalho da página', () => {
    mockAxios.get.mockReturnValue(new Promise(() => {}));
    renderVerificar('abc123');
    expect(screen.getByText(/Valida/i)).toBeInTheDocument();
  });

  it('exibe texto de verificação de certificado', () => {
    mockAxios.get.mockReturnValue(new Promise(() => {}));
    renderVerificar('abc123');
    expect(screen.getByText(/Verificação de Certificado/i)).toBeInTheDocument();
  });

  it('exibe estado de carregamento enquanto verifica', () => {
    mockAxios.get.mockReturnValue(new Promise(() => {}));
    renderVerificar('abc123');
    expect(screen.getByText('Verificando certificado...')).toBeInTheDocument();
  });

  it('exibe certificado inválido quando hash não encontrado (404)', async () => {
    const err = { response: { status: 404 } };
    mockAxios.get.mockRejectedValue(err);
    mockAxios.isAxiosError.mockReturnValue(true);
    renderVerificar('hash-invalido');
    await waitFor(() =>
      expect(screen.getByText('Certificado Inválido')).toBeInTheDocument(),
    );
  });

  it('exibe erro genérico para falhas que não sejam 404', async () => {
    const err = { response: { status: 500 } };
    mockAxios.get.mockRejectedValue(err);
    mockAxios.isAxiosError.mockReturnValue(true);
    renderVerificar('hash-erro');
    await waitFor(() =>
      expect(screen.getByText(/Erro ao verificar/i)).toBeInTheDocument(),
    );
  });

  it('exibe erro genérico quando não é erro do axios', async () => {
    mockAxios.get.mockRejectedValue(new Error('Network error'));
    mockAxios.isAxiosError.mockReturnValue(false);
    renderVerificar('hash-rede');
    await waitFor(() =>
      expect(screen.getByText(/Erro ao verificar/i)).toBeInTheDocument(),
    );
  });

  it('exibe certificado válido com dados do estudante e documento', async () => {
    const dados = {
      valido: true,
      certificado: { id: 'cert-1', hash: 'abc123hash', emitido_em: '2024-01-15T10:00:00Z' },
      estudante: { nome: 'João Silva', email: 'joao@ufsc.br' },
      documento: { titulo: 'Certificado de Curso', tipo: 'certificado_curso', carga_horaria: 40, status: 'aprovado' },
    };
    mockAxios.get.mockResolvedValue({ data: dados });
    renderVerificar('abc123hash');
    await waitFor(() =>
      expect(screen.getByText('Certificado Válido')).toBeInTheDocument(),
    );
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@ufsc.br')).toBeInTheDocument();
    expect(screen.getByText('Certificado de Curso')).toBeInTheDocument();
    expect(screen.getByText('abc123hash')).toBeInTheDocument();
  });

  it('exibe tipo de documento legível quando disponível no mapa', async () => {
    const dados = {
      valido: true,
      certificado: { id: 'cert-2', hash: 'xyz456', emitido_em: '2024-03-01T00:00:00Z' },
      estudante: { nome: 'Maria', email: 'maria@ufsc.br' },
      documento: { titulo: 'TCC Final', tipo: 'artigo_publicado', carga_horaria: 60, status: 'aprovado' },
    };
    mockAxios.get.mockResolvedValue({ data: dados });
    renderVerificar('xyz456');
    await waitFor(() =>
      expect(screen.getByText('Artigo Publicado · 60h')).toBeInTheDocument(),
    );
  });

  it('não executa a query quando hash está ausente', () => {
    renderVerificar();
    expect(mockAxios.get).not.toHaveBeenCalled();
  });
});
