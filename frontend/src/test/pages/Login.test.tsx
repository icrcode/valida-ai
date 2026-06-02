import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { Login } from '../../pages/Login';

vi.mock('../../services/api', () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('Login', () => {
  it('renderiza o título da aplicação', () => {
    renderWithProviders(<Login />);
    expect(screen.getByText(/Valida/i)).toBeInTheDocument();
  });

  it('renderiza campo de e-mail', () => {
    renderWithProviders(<Login />);
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
  });

  it('renderiza campo de senha', () => {
    renderWithProviders(<Login />);
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('renderiza botão de entrar', () => {
    renderWithProviders(<Login />);
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });
});
