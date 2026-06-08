import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, USUARIO_ESTUDANTE } from '../helpers/renderWithProviders';
import { SubmeterDocumento } from '../../pages/SubmeterDocumento';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
  };
});

const mockDocumentosService = { submeter: vi.fn() };

vi.mock('../../services/documentos', () => ({
  documentosService: mockDocumentosService,
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

function renderSubmeter() {
  return renderWithProviders(<SubmeterDocumento />, { token: 'tok', usuario: USUARIO_ESTUDANTE });
}

describe('SubmeterDocumento — renderização', () => {
  it('renderiza o título Submeter Documento', () => {
    renderSubmeter();
    expect(screen.getByText('Submeter Documento')).toBeInTheDocument();
  });

  it('renderiza campo de título', () => {
    renderSubmeter();
    expect(screen.getByPlaceholderText('Nome do documento')).toBeInTheDocument();
  });

  it('renderiza select de tipo de documento', () => {
    renderSubmeter();
    expect(screen.getByText('Selecione o tipo…')).toBeInTheDocument();
  });

  it('renderiza campo de carga horária', () => {
    renderSubmeter();
    expect(screen.getByPlaceholderText('ex: 40')).toBeInTheDocument();
  });

  it('renderiza botão de submeter', () => {
    renderSubmeter();
    expect(screen.getByText('Submeter documento')).toBeInTheDocument();
  });

  it('renderiza aviso sobre PDF', () => {
    renderSubmeter();
    expect(screen.getByText('Por que apenas PDF?')).toBeInTheDocument();
  });

  it('renderiza botão Cancelar', () => {
    renderSubmeter();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });
});

describe('SubmeterDocumento — validação de campos', () => {
  it('exibe erro quando título está vazio', async () => {
    renderSubmeter();
    fireEvent.click(screen.getByText('Submeter documento'));
    await waitFor(() => {
      expect(screen.getByText('Mínimo 3 caracteres')).toBeInTheDocument();
    });
  });

  it('exibe erro quando título tem menos de 3 caracteres', async () => {
    renderSubmeter();
    fireEvent.change(screen.getByPlaceholderText('Nome do documento'), { target: { value: 'AB' } });
    fireEvent.click(screen.getByText('Submeter documento'));
    await waitFor(() => {
      expect(screen.getByText('Mínimo 3 caracteres')).toBeInTheDocument();
    });
  });

  it('exibe erro quando tipo não está selecionado', async () => {
    renderSubmeter();
    fireEvent.change(screen.getByPlaceholderText('Nome do documento'), { target: { value: 'Certificado Válido' } });
    fireEvent.click(screen.getByText('Submeter documento'));
    await waitFor(() => {
      expect(screen.getByText('Selecione o tipo do documento')).toBeInTheDocument();
    });
  });

  it('exibe erro quando carga horária é zero', async () => {
    renderSubmeter();
    fireEvent.change(screen.getByPlaceholderText('Nome do documento'), { target: { value: 'Certificado Válido' } });
    fireEvent.change(screen.getByPlaceholderText('ex: 40'), { target: { value: '0' } });
    fireEvent.click(screen.getByText('Submeter documento'));
    await waitFor(() => {
      expect(screen.getByText('Informe um número inteiro positivo')).toBeInTheDocument();
    });
  });

  it('exibe erro quando carga horária é negativa', async () => {
    renderSubmeter();
    fireEvent.change(screen.getByPlaceholderText('Nome do documento'), { target: { value: 'Certificado Válido' } });
    fireEvent.change(screen.getByPlaceholderText('ex: 40'), { target: { value: '-1' } });
    fireEvent.click(screen.getByText('Submeter documento'));
    await waitFor(() => {
      expect(screen.getByText('Informe um número inteiro positivo')).toBeInTheDocument();
    });
  });

  it('exibe erro quando nenhum arquivo é selecionado', async () => {
    renderSubmeter();
    fireEvent.change(screen.getByPlaceholderText('Nome do documento'), { target: { value: 'Certificado Válido' } });
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'certificado_curso' } });
    fireEvent.change(screen.getByPlaceholderText('ex: 40'), { target: { value: '40' } });
    fireEvent.click(screen.getByText('Submeter documento'));
    await waitFor(() => {
      expect(screen.getByText('Selecione um arquivo PDF')).toBeInTheDocument();
    });
  });
});

describe('SubmeterDocumento — interações de campo', () => {
  it('limpa erro de título ao digitar', async () => {
    renderSubmeter();
    fireEvent.click(screen.getByText('Submeter documento'));
    await waitFor(() => screen.getByText('Mínimo 3 caracteres'));
    fireEvent.change(screen.getByPlaceholderText('Nome do documento'), { target: { value: 'Cert' } });
    expect(screen.queryByText('Mínimo 3 caracteres')).not.toBeInTheDocument();
  });

  it('limpa erro de tipo ao selecionar', async () => {
    renderSubmeter();
    fireEvent.change(screen.getByPlaceholderText('Nome do documento'), { target: { value: 'Cert Válido' } });
    fireEvent.click(screen.getByText('Submeter documento'));
    await waitFor(() => screen.getByText('Selecione o tipo do documento'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'certificado_curso' } });
    expect(screen.queryByText('Selecione o tipo do documento')).not.toBeInTheDocument();
  });

  it('botão Cancelar chama navigate(-1)', () => {
    renderSubmeter();
    fireEvent.click(screen.getByText('Cancelar'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('renderiza todas as opções de tipo no select', () => {
    renderSubmeter();
    const select = screen.getByRole('combobox');
    expect(select).toBeTruthy();
    expect(screen.getByText('Certificado de Curso')).toBeInTheDocument();
    expect(screen.getByText('Certificado de Evento')).toBeInTheDocument();
    expect(screen.getByText('Declaração de Participação')).toBeInTheDocument();
    expect(screen.getByText('Comprovante de Atividade')).toBeInTheDocument();
    expect(screen.getByText('Artigo Publicado')).toBeInTheDocument();
    expect(screen.getByText('Outro')).toBeInTheDocument();
  });
});
