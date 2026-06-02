import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { Login } from '../../pages/Login';

vi.mock('../../services/api');

describe('Login', () => {
  it('renderiza o título da aplicação', () => {
    renderWithProviders(<Login />);
    expect(screen.getAllByText(/Valida/i)[0]).toBeInTheDocument();
  });

  it('renderiza campo de e-mail', () => {
    renderWithProviders(<Login />);
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  it('renderiza campo de senha', () => {
    renderWithProviders(<Login />);
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  it('renderiza botão de entrar', () => {
    renderWithProviders(<Login />);
    expect(screen.getByText('Entrar')).toBeInTheDocument();
  });

  it('exibe link para criar conta', () => {
    renderWithProviders(<Login />);
    expect(screen.getByText(/Criar conta/i)).toBeInTheDocument();
  });
});
