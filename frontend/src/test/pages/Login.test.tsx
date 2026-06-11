import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { Login } from '../../pages/Login';

vi.mock('../../services/api');

describe('Login', () => {
  it('renderiza o título da aplicação', () => {
    renderWithProviders(<Login />);
    expect(screen.getAllByText(/Valida/i)[0]).toBeInTheDocument();
  });

  it('renderiza o campo de e-mail na primeira etapa', () => {
    renderWithProviders(<Login />);
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
  });

  it('renderiza botão Continuar na primeira etapa', () => {
    renderWithProviders(<Login />);
    expect(screen.getByText('Continuar')).toBeInTheDocument();
  });

  it('avança para a etapa de senha após informar um e-mail válido', () => {
    renderWithProviders(<Login />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'joao@test.com' } });
    fireEvent.click(screen.getByText('Continuar'));
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByText('Entrar')).toBeInTheDocument();
    expect(screen.getByText('joao@test.com')).toBeInTheDocument();
  });

  it('exibe link para criar conta na primeira etapa', () => {
    renderWithProviders(<Login />);
    expect(screen.getByText(/Criar conta/i)).toBeInTheDocument();
  });

  it('não exibe link para criar conta na etapa de senha', () => {
    renderWithProviders(<Login />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'joao@test.com' } });
    fireEvent.click(screen.getByText('Continuar'));
    expect(screen.queryByText(/Criar conta/i)).not.toBeInTheDocument();
  });
});
