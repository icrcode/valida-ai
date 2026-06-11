import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { Login } from '../../pages/Login';

const { mockLogin, mockNavigate, mockAuthService } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockNavigate: vi.fn(),
  mockAuthService: { login: vi.fn() },
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: vi.fn(() => ({ login: mockLogin, usuario: null, token: null, logout: vi.fn() })),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock('../../services/auth', () => ({
  authService: mockAuthService,
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

function avancarParaSenha(email: string) {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  fireEvent.click(screen.getByText('Continuar'));
}

describe('Login — etapa de e-mail', () => {
  it('exibe erro quando submete sem email', async () => {
    renderWithProviders(<Login />);
    await act(async () => {
      fireEvent.submit(screen.getByText('Continuar').closest('form')!);
    });
    expect(screen.getByText('Informe seu e-mail')).toBeInTheDocument();
  });

  it('exibe erro quando o e-mail é inválido', async () => {
    renderWithProviders(<Login />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'invalido' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Continuar').closest('form')!);
    });
    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
  });

  it('limpa erro ao digitar no campo de email', async () => {
    renderWithProviders(<Login />);
    await act(async () => {
      fireEvent.submit(screen.getByText('Continuar').closest('form')!);
    });
    expect(screen.getByText('Informe seu e-mail')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a' } });
    expect(screen.queryByText('Informe seu e-mail')).not.toBeInTheDocument();
  });
});

describe('Login — etapa de senha', () => {
  it('exibe erro quando submete sem senha', async () => {
    renderWithProviders(<Login />);
    avancarParaSenha('joao@test.com');
    await act(async () => {
      fireEvent.submit(screen.getByText('Entrar').closest('form')!);
    });
    expect(screen.getByText('Informe sua senha')).toBeInTheDocument();
  });

  it('limpa erro ao digitar no campo de senha', async () => {
    renderWithProviders(<Login />);
    avancarParaSenha('joao@test.com');
    await act(async () => {
      fireEvent.submit(screen.getByText('Entrar').closest('form')!);
    });
    expect(screen.getByText('Informe sua senha')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 's' } });
    expect(screen.queryByText('Informe sua senha')).not.toBeInTheDocument();
  });

  it('permite trocar o e-mail e voltar para a primeira etapa', async () => {
    renderWithProviders(<Login />);
    avancarParaSenha('joao@test.com');
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByText('Trocar'));

    expect(screen.getByLabelText('E-mail')).toHaveValue('joao@test.com');
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();

    avancarParaSenha('joao@test.com');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
  });
});

describe('Login — submit com sucesso e erro', () => {
  it('chama authService.login e navega para dashboard em caso de sucesso', async () => {
    mockAuthService.login.mockResolvedValue({ token: 'tok-123', usuario: { id: 'u-1', nome: 'João', email: 'joao@test.com', perfil: 'estudante' } });
    renderWithProviders(<Login />);
    avancarParaSenha('joao@test.com');
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Entrar').closest('form')!);
    });
    await waitFor(() => expect(mockAuthService.login).toHaveBeenCalledWith('joao@test.com', 'senha123'));
    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('exibe mensagem de erro quando authService.login rejeita', async () => {
    mockAuthService.login.mockRejectedValue({ response: { data: { erro: 'Credenciais inválidas' } } });
    renderWithProviders(<Login />);
    avancarParaSenha('joao@test.com');
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Entrar').closest('form')!);
    });
    await waitFor(() => expect(screen.queryByText('Entrando...')).not.toBeInTheDocument());
    expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
  });

  it('normaliza o e-mail para lowercase antes de enviar', async () => {
    mockAuthService.login.mockResolvedValue({ token: 'tok', usuario: { id: 'u-1', nome: 'João', email: 'joao@test.com', perfil: 'estudante' } });
    renderWithProviders(<Login />);
    avancarParaSenha('  JOAO@TEST.COM  ');
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Entrar').closest('form')!);
    });
    await waitFor(() => expect(mockAuthService.login).toHaveBeenCalledWith('joao@test.com', 'senha123'));
  });
});

describe('Login — toggle mostrar/ocultar senha', () => {
  it('senha começa como password', () => {
    renderWithProviders(<Login />);
    avancarParaSenha('joao@test.com');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('clicando em Mostrar senha muda para text', () => {
    renderWithProviders(<Login />);
    avancarParaSenha('joao@test.com');
    fireEvent.click(screen.getByLabelText('Mostrar senha'));
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Ocultar senha')).toBeInTheDocument();
  });

  it('clicando novamente volta para password', () => {
    renderWithProviders(<Login />);
    avancarParaSenha('joao@test.com');
    fireEvent.click(screen.getByLabelText('Mostrar senha'));
    fireEvent.click(screen.getByLabelText('Ocultar senha'));
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });
});
