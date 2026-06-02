import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Verificar } from '../../pages/Verificar';

vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockRejectedValue({ isAxiosError: true, response: { status: 404 } }),
    isAxiosError: vi.fn().mockReturnValue(true),
  },
}));

function renderVerificar(hash?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[hash ? `/verificar/${hash}` : '/verificar']}>
        <Routes>
          <Route path="/verificar/:hash" element={<Verificar />} />
          <Route path="/verificar" element={<Verificar />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Verificar', () => {
  it('renderiza o cabeçalho da página', () => {
    renderVerificar('abc123');
    expect(screen.getByText(/Valida/i)).toBeInTheDocument();
  });

  it('exibe texto de verificação de certificado', () => {
    renderVerificar('abc123');
    expect(screen.getByText(/Verificação de Certificado/i)).toBeInTheDocument();
  });
});
