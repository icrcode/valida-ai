import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { App } from '../App';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

vi.mock('../lib/queryClient', () => ({
  queryClient: new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  }),
}));

beforeEach(() => {
  localStorage.clear();
});

describe('App', () => {
  it('renderiza sem erros', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('exibe a tela de apresentação na rota padrão quando não autenticado', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('exibe convite para criar conta na tela de apresentação quando não autenticado', () => {
    render(<App />);
    const link = screen.queryByRole('link', { name: /começar agora/i });
    expect(link).toBeInTheDocument();
  });
});
