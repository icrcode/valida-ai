import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../../components/ui/Card';

describe('Card', () => {
  it('renderiza os filhos', () => {
    render(<Card>Conteúdo do card</Card>);
    expect(screen.getByText('Conteúdo do card')).toBeInTheDocument();
  });

  it('aplica classes padrão', () => {
    const { container } = render(<Card>texto</Card>);
    expect(container.firstChild).toHaveClass('rounded-xl');
  });

  it('aceita className adicional', () => {
    render(<Card className="col-span-2">texto</Card>);
    const el = screen.getByText('texto');
    expect(el).toHaveClass('col-span-2');
  });
});
