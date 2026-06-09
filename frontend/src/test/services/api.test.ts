import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Testa os interceptors do axios diretamente sem mockar o módulo api
// O queryClient precisa ser mockado para evitar imports circulares
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

  it('adiciona header Authorization quando token existe no localStorage', async () => {
    localStorage.setItem('token', 'meu-token-123');
    const { default: api } = await import('../../services/api');

    // Pega o handler do request interceptor e executa diretamente
    const handlers = (api.interceptors.request as unknown as {
      handlers: Array<{ fulfilled: (c: unknown) => unknown }>;
    }).handlers;
    const handler = handlers[handlers.length - 1]?.fulfilled;
    expect(handler).toBeDefined();

    const fakeConfig = { headers: {} as Record<string, string> };
    const result = handler(fakeConfig) as typeof fakeConfig;
    expect(result.headers.Authorization).toBe('Bearer meu-token-123');
  });

  it('não adiciona header Authorization quando token não existe', async () => {
    const { default: api } = await import('../../services/api');

    const handlers = (api.interceptors.request as unknown as {
      handlers: Array<{ fulfilled: (c: unknown) => unknown }>;
    }).handlers;
    const handler = handlers[handlers.length - 1]?.fulfilled;

    const fakeConfig = { headers: {} as Record<string, string> };
    const result = handler(fakeConfig) as typeof fakeConfig;
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('limpa token e redireciona ao receber 401', async () => {
    localStorage.setItem('token', 'tok');
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
    expect(localStorage.getItem('token')).toBeNull();
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

    // Erro sem response (timeout, CORS, etc.)
    await expect(errorHandler({ message: 'Network Error' })).rejects.toMatchObject({
      message: 'Network Error',
    });
    expect(globalThis.location.replace).not.toHaveBeenCalled();
  });
});
