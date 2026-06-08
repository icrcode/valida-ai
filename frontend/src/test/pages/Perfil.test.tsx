import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, USUARIO_ESTUDANTE, USUARIO_COORD } from '../helpers/renderWithProviders';
import { Perfil } from '../../pages/Perfil';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

const mockUsuariosService = {
  getPerfil: vi.fn(),
  atualizarPerfil: vi.fn(),
};

vi.mock('../../services/usuarios', () => ({
  usuariosService: mockUsuariosService,
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUsuariosService.getPerfil.mockResolvedValue(USUARIO_ESTUDANTE);
});

function renderPerfil(usuario = USUARIO_ESTUDANTE) {
  return renderWithProviders(<Perfil />, { token: 'tok-test', usuario });
}

describe('Perfil — modo VER', () => {
  it('renderiza o título Meu Perfil', async () => {
    renderPerfil();
    expect(screen.getByText('Meu Perfil')).toBeInTheDocument();
  });

  it('exibe o nome do usuário', async () => {
    renderPerfil();
    await waitFor(() => {
      expect(screen.getAllByText(USUARIO_ESTUDANTE.nome)[0]).toBeInTheDocument();
    });
  });

  it('exibe o email do usuário', async () => {
    renderPerfil();
    await waitFor(() => {
      expect(screen.getAllByText(USUARIO_ESTUDANTE.email)[0]).toBeInTheDocument();
    });
  });

  it('exibe botão Editar perfil', async () => {
    renderPerfil();
    await waitFor(() => {
      expect(screen.getByText('Editar perfil')).toBeInTheDocument();
    });
  });

  it('exibe botão Alterar senha', async () => {
    renderPerfil();
    await waitFor(() => {
      expect(screen.getByText('Alterar senha')).toBeInTheDocument();
    });
  });

  it('exibe matrícula para estudante', async () => {
    renderPerfil();
    await waitFor(() => {
      expect(screen.getByText('Matrícula')).toBeInTheDocument();
    });
  });

  it('exibe instituição quando presente', async () => {
    renderPerfil();
    await waitFor(() => {
      expect(screen.getByText('Universidade Teste')).toBeInTheDocument();
    });
  });
});

describe('Perfil — modo EDITAR DADOS', () => {
  it('abre modo editar ao clicar em Editar perfil', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Editar perfil'));
    fireEvent.click(screen.getByText('Editar perfil'));
    expect(screen.getByText('Editar dados pessoais')).toBeInTheDocument();
  });

  it('exibe campo de nome no modo editar', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Editar perfil'));
    fireEvent.click(screen.getByText('Editar perfil'));
    expect(screen.getByPlaceholderText('Seu nome completo')).toBeInTheDocument();
  });

  it('exibe campo de email no modo editar', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Editar perfil'));
    fireEvent.click(screen.getByText('Editar perfil'));
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
  });

  it('exibe campo de matrícula para estudante no modo editar', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Editar perfil'));
    fireEvent.click(screen.getByText('Editar perfil'));
    expect(screen.getByPlaceholderText('Número de matrícula')).toBeInTheDocument();
  });

  it('exibe erro quando nome é muito curto ao salvar', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Editar perfil'));
    fireEvent.click(screen.getByText('Editar perfil'));
    const inputNome = screen.getByPlaceholderText('Seu nome completo');
    fireEvent.change(inputNome, { target: { value: 'A' } });
    fireEvent.click(screen.getByText('Salvar alterações'));
    await waitFor(() => {
      expect(screen.getByText(/mínimo 2 caracteres/i)).toBeInTheDocument();
    });
  });

  it('exibe erro quando email é inválido ao salvar', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Editar perfil'));
    fireEvent.click(screen.getByText('Editar perfil'));
    const inputNome = screen.getByPlaceholderText('Seu nome completo');
    fireEvent.change(inputNome, { target: { value: 'Nome Válido' } });
    const inputEmail = screen.getByPlaceholderText('seu@email.com');
    fireEvent.change(inputEmail, { target: { value: 'invalido' } });
    fireEvent.click(screen.getByText('Salvar alterações'));
    await waitFor(() => {
      expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
    });
  });

  it('cancela edição e volta ao modo ver', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Editar perfil'));
    fireEvent.click(screen.getByText('Editar perfil'));
    expect(screen.getByText('Editar dados pessoais')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(screen.queryByText('Editar dados pessoais')).not.toBeInTheDocument();
      expect(screen.getByText('Editar perfil')).toBeInTheDocument();
    });
  });

  it('salva dados com sucesso e volta ao modo ver', async () => {
    mockUsuariosService.atualizarPerfil.mockResolvedValue({ ...USUARIO_ESTUDANTE, nome: 'Nome Atualizado' });
    renderPerfil();
    await waitFor(() => screen.getByText('Editar perfil'));
    fireEvent.click(screen.getByText('Editar perfil'));
    const inputNome = screen.getByPlaceholderText('Seu nome completo');
    fireEvent.change(inputNome, { target: { value: 'Nome Atualizado' } });
    fireEvent.click(screen.getByText('Salvar alterações'));
    await waitFor(() => expect(mockUsuariosService.atualizarPerfil).toHaveBeenCalled());
  });

  it('exibe campos de CPF e endereço para coordenador', async () => {
    renderPerfil(USUARIO_COORD);
    await waitFor(() => screen.getByText('Editar perfil'));
    fireEvent.click(screen.getByText('Editar perfil'));
    expect(screen.getByPlaceholderText('000.000.000-00')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Rua, número/i)).toBeInTheDocument();
  });
});

describe('Perfil — modo EDITAR SENHA', () => {
  it('abre modo alterar senha ao clicar no botão', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Alterar senha'));
    fireEvent.click(screen.getByText('Alterar senha'));
    expect(screen.getByText('Alterar senha', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sua senha atual')).toBeInTheDocument();
  });

  it('exibe erro quando senha atual não é informada', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Alterar senha'));
    fireEvent.click(screen.getByText('Alterar senha'));
    fireEvent.click(screen.getByText('Salvar nova senha'));
    await waitFor(() => {
      expect(screen.getByText('Informe a senha atual')).toBeInTheDocument();
    });
  });

  it('exibe erro quando nova senha é muito curta', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Alterar senha'));
    fireEvent.click(screen.getByText('Alterar senha'));
    fireEvent.change(screen.getByPlaceholderText('Sua senha atual'), { target: { value: 'senhaAtual' } });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: '123' } });
    fireEvent.click(screen.getByText('Salvar nova senha'));
    await waitFor(() => {
      expect(screen.getByText(/mínimo 6 caracteres/i)).toBeInTheDocument();
    });
  });

  it('exibe erro quando senhas não conferem', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Alterar senha'));
    fireEvent.click(screen.getByText('Alterar senha'));
    fireEvent.change(screen.getByPlaceholderText('Sua senha atual'), { target: { value: 'senhaAtual' } });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: 'novaSenha1' } });
    fireEvent.change(screen.getByPlaceholderText('Repita a nova senha'), { target: { value: 'novaSenha2' } });
    await waitFor(() => {
      expect(screen.getByText('As senhas não conferem')).toBeInTheDocument();
    });
  });

  it('cancela troca de senha e volta ao modo ver', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Alterar senha'));
    fireEvent.click(screen.getByText('Alterar senha'));
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Sua senha atual')).not.toBeInTheDocument();
      expect(screen.getByText('Editar perfil')).toBeInTheDocument();
    });
  });

  it('toggle mostrar/ocultar senha no modo editar senha', async () => {
    renderPerfil();
    await waitFor(() => screen.getByText('Alterar senha'));
    fireEvent.click(screen.getByText('Alterar senha'));
    const inputSenhaAtual = screen.getByPlaceholderText('Sua senha atual');
    expect(inputSenhaAtual).toHaveAttribute('type', 'password');
    const btnToggle = inputSenhaAtual.parentElement!.querySelector('button[type="button"]')!;
    fireEvent.click(btnToggle);
    expect(inputSenhaAtual).toHaveAttribute('type', 'text');
  });

  it('chama atualizarPerfil quando todos os campos são válidos', async () => {
    mockUsuariosService.atualizarPerfil.mockResolvedValue(USUARIO_ESTUDANTE);
    renderPerfil();
    await waitFor(() => screen.getByText('Alterar senha'));
    fireEvent.click(screen.getByText('Alterar senha'));
    fireEvent.change(screen.getByPlaceholderText('Sua senha atual'), { target: { value: 'senhaAtual' } });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: 'novaSenha123' } });
    fireEvent.change(screen.getByPlaceholderText('Repita a nova senha'), { target: { value: 'novaSenha123' } });
    fireEvent.click(screen.getByText('Salvar nova senha'));
    await waitFor(() => expect(mockUsuariosService.atualizarPerfil).toHaveBeenCalledWith({
      senha_atual: 'senhaAtual',
      nova_senha: 'novaSenha123',
    }));
  });
});
