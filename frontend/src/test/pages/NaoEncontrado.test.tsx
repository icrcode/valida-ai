import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NaoEncontrado } from '../../pages/NaoEncontrado';

describe('NaoEncontrado', () => {
  it('exibe o código 404', () => {
    render(<MemoryRouter><NaoEncontrado /></MemoryRouter>);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('exibe mensagem de página não encontrada', () => {
    render(<MemoryRouter><NaoEncontrado /></MemoryRouter>);
    expect(screen.getByText('Página não encontrada')).toBeInTheDocument();
  });

  it('exibe link para voltar ao início', () => {
    render(<MemoryRouter><NaoEncontrado /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /voltar ao início/i })).toHaveAttribute('href', '/dashboard');
  });
});
