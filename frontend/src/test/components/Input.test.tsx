import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../../components/ui/Input';

describe('Input', () => {
  it('renderiza um input', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('exibe label quando fornecida', () => {
    render(<Input label="E-mail" id="email" />);
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  it('não exibe label quando não fornecida', () => {
    render(<Input />);
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });

  it('exibe mensagem de erro', () => {
    render(<Input error="Campo obrigatório" />);
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });

  it('aplica borda vermelha quando há erro', () => {
    render(<Input error="Inválido" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500/50');
  });

  it('não aplica borda vermelha sem erro', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toHaveClass('border-white/10');
  });

  it('passa props extras para o input', () => {
    render(<Input placeholder="Digite aqui" type="email" />);
    const input = screen.getByPlaceholderText('Digite aqui');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('aceita className adicional', () => {
    render(<Input className="w-full" />);
    expect(screen.getByRole('textbox')).toHaveClass('w-full');
  });
});
