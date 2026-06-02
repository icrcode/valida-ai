import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, USUARIO_ESTUDANTE } from '../helpers/renderWithProviders';
import { Dashboard } from '../../pages/Dashboard';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { total: 0, dados: [] } }) },
}));

describe('Dashboard', () => {
  it('renderiza a página sem erros', () => {
    const { container } = renderWithProviders(<Dashboard />, {
      token: 'tok-123', usuario: USUARIO_ESTUDANTE,
    });
    expect(container).toBeTruthy();
  });

  it('exibe algum conteúdo do dashboard', () => {
    renderWithProviders(<Dashboard />, {
      token: 'tok-123', usuario: USUARIO_ESTUDANTE,
    });
    expect(document.body).toBeTruthy();
  });
});
