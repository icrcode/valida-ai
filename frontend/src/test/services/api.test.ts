import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../lib/queryClient', () => ({
  queryClient: { clear: vi.fn() },
}));

describe('api interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('location', { replace: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('configura withCredentials como true', async () => {
    const { default: api } = await import('../../services/api');
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('não possui request interceptor de Authorization', async () => {
    const { default: api } = await import('../../services/api');
    const handlers = (api.interceptors.request as unknown as {
      handlers: Array<{ fulfilled: (c: unknown) => unknown } | null>;
    }).handlers;
    const activeHandlers = handlers.filter(Boolean);
    expect(activeHandlers).toHaveLength(0);
  });

  it('limpa usuario e redireciona ao receber 401', async () => {
    localStorage.setItem('usuario', '{}');
    const { default: api } = await import('../../services/api');
    const { queryClient } = await import('../../lib/queryClient');

    const responseHandlers = (api.interceptors.response as unknown as {
      handlers: Array<{ rejected: (e: unknown) => unknown }>;
    }).handlers;
    const errorHandler = responseHandlers[responseHandlers.length - 1]?.rejected;
    expect(errorHandler).toBeDefined();

    await expect(errorHandler({ response: { status: 401 } })).rejects.toBeTruthy();
    expect(queryClient.clear).toHaveBeenCalled();
    expect(localStorage.getItem('usuario')).toBeNull();
  });

  it('rejeita o erro sem redirecionar para status diferente de 401', async () => {
    const { default: api } = await import('../../services/api');

    const responseHandlers = (api.interceptors.response as unknown as {
      handlers: Array<{ rejected: (e: unknown) => unknown }>;
    }).handlers;
    const errorHandler = responseHandlers[responseHandlers.length - 1]?.rejected;

    await expect(errorHandler({ response: { status: 500 } })).rejects.toMatchObject({
      response: { status: 500 },
    });
    expect(globalThis.location.replace).not.toHaveBeenCalled();
  });

  it('rejeita sem redirecionar quando erro não tem response (ex: network error)', async () => {
    const { default: api } = await import('../../services/api');

    const responseHandlers = (api.interceptors.response as unknown as {
      handlers: Array<{ rejected: (e: unknown) => unknown }>;
    }).handlers;
    const errorHandler = responseHandlers[responseHandlers.length - 1]?.rejected;

    await expect(errorHandler({ message: 'Network Error' })).rejects.toMatchObject({
      message: 'Network Error',
    });
    expect(globalThis.location.replace).not.toHaveBeenCalled();
  });
});
