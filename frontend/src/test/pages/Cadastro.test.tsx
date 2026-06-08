import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { Cadastro } from '../../pages/Cadastro';

const { mockAuthService, mockLogin, mockNavigate, mockCursosService } = vi.hoisted(() => ({
  mockAuthService: { cadastrar: vi.fn() },
  mockLogin: vi.fn(),
  mockNavigate: vi.fn(),
  mockCursosService: { listar: vi.fn() },
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock('../../services/auth', () => ({ authService: mockAuthService }));

vi.mock('../../services/cursos', () => ({
  cursosService: mockCursosService,
  // re-export the type alias (Vitest needs the module to have the named export)
}));

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return { ...actual, useAuth: vi.fn(() => ({ login: mockLogin, usuario: null, token: null, logout: vi.fn() })) };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) };
});

const CURSOS_MOCK = [
  { id: 'c-1', nome: 'Engenharia de Software', instituicao_id: 'i-1', instituicao_nome: 'Universidade Teste' },
  { id: 'c-2', nome: 'Ciência da Computação', instituicao_id: 'i-1', instituicao_nome: 'Universidade Teste' },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockCursosService.listar.mockResolvedValue(CURSOS_MOCK);
});

describe('Cadastro — renderização', () => {
  it('renderiza o título Criar conta de estudante', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByText('Criar conta de estudante')).toBeInTheDocument());
  });

  it('renderiza o campo de nome', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('Nome completo')).toBeInTheDocument());
  });

  it('renderiza o campo de e-mail', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('E-mail institucional')).toBeInTheDocument());
  });

  it('renderiza o campo de matrícula', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('Matrícula')).toBeInTheDocument());
  });

  it('renderiza o campo de senha', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('Senha')).toBeInTheDocument());
  });

  it('renderiza o campo de confirmar senha', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('Confirmar senha')).toBeInTheDocument());
  });

  it('renderiza botão Criar conta', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByText('Criar conta')).toBeInTheDocument());
  });

  it('renderiza link para login', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByText('Entrar')).toBeInTheDocument());
  });

  it('renderiza select de curso com opções após carregar', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => {
      expect(screen.getByText('Engenharia de Software')).toBeInTheDocument();
      expect(screen.getByText('Ciência da Computação')).toBeInTheDocument();
    });
  });

  it('renderiza cursos agrupados por instituição', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => {
      // optgroup label is rendered as an attribute, verifica via querySelector
      const optgroup = document.querySelector('optgroup[label="Universidade Teste"]');
      expect(optgroup).toBeTruthy();
    });
  });
});

describe('Cadastro — validações', () => {
  it('exibe erro quando nome é muito curto', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByText('Criar conta'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'A' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText(/mínimo 2 caracteres/i)).toBeInTheDocument();
  });

  it('exibe erro quando e-mail é inválido', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByText('Criar conta'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'invalido' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText(/e-mail válido/i)).toBeInTheDocument();
  });

  it('exibe erro quando senha é muito curta', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByText('Criar conta'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'joao@uni.edu.br' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText(/mínimo 6 caracteres/i)).toBeInTheDocument();
  });

  it('exibe erro quando senhas não conferem', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByText('Criar conta'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'joao@uni.edu.br' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senhaXXX' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getAllByText(/As senhas não conferem/i)[0]).toBeInTheDocument();
  });

  it('exibe erro quando curso não está selecionado', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByText('Criar conta'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'joao@uni.edu.br' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha123' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText('Selecione seu curso', { exact: true })).toBeInTheDocument();
  });

  it('exibe erro quando matrícula é muito curta', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => {
      expect(screen.getByLabelText('Curso')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'joao@uni.edu.br' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'c-1' } });
    fireEvent.change(screen.getByLabelText('Matrícula'), { target: { value: 'A' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText(/matrícula acadêmica/i)).toBeInTheDocument();
  });

  it('exibe aviso de senhas não conferem em tempo real', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByText('Criar conta'));
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senhaXXX' } });
    expect(screen.getAllByText('As senhas não conferem')[0]).toBeInTheDocument();
  });

  it('limpa erro ao digitar', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByText('Criar conta'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'A' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText(/mínimo 2 caracteres/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    expect(screen.queryByText(/mínimo 2 caracteres/i)).not.toBeInTheDocument();
  });
});

describe('Cadastro — toggle senha', () => {
  it('senha começa como password', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password'));
  });

  it('toggle alterna para text', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Mostrar senha'));
    fireEvent.click(screen.getByLabelText('Mostrar senha'));
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
  });
});

describe('Cadastro — submit', () => {
  it('chama authService.cadastrar com dados corretos', async () => {
    mockAuthService.cadastrar.mockResolvedValue({ token: 'tok', usuario: { id: 'u-1', nome: 'Nome Válido', email: 'joao@uni.edu.br', perfil: 'estudante' } });
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Curso'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: '  Nome Válido  ' } });
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'JOAO@UNI.EDU.BR' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'c-1' } });
    fireEvent.change(screen.getByLabelText('Matrícula'), { target: { value: '2021001' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    await waitFor(() => expect(mockAuthService.cadastrar).toHaveBeenCalledWith({
      nome: 'Nome Válido',
      email: 'joao@uni.edu.br',
      senha: 'senha123',
      matricula: '2021001',
      curso_id: 'c-1',
    }));
    expect(mockLogin).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('exibe erro quando authService.cadastrar rejeita', async () => {
    mockAuthService.cadastrar.mockRejectedValue(new Error('E-mail já cadastrado'));
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Curso'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'joao@uni.edu.br' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'c-1' } });
    fireEvent.change(screen.getByLabelText('Matrícula'), { target: { value: '2021001' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    await waitFor(() => expect(screen.getByText(/Falha ao criar conta/i)).toBeInTheDocument());
  });
});
