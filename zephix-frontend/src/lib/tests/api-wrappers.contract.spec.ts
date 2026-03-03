import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('api wrappers contract', () => {
  async function loadApiModule() {
    vi.resetModules();
    const responseHandlers: Array<{
      fulfilled?: (value: unknown) => unknown;
      rejected?: (error: unknown) => unknown;
    }> = [];
    const instance = {
      interceptors: {
        request: { use: vi.fn() },
        response: {
          handlers: responseHandlers,
          use: vi.fn(
            (fulfilled?: (value: unknown) => unknown, rejected?: (error: unknown) => unknown) => {
              responseHandlers.push({ fulfilled, rejected });
              return responseHandlers.length - 1;
            },
          ),
        },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    vi.doMock('axios', () => ({
      default: {
        create: vi.fn(() => instance),
        get: vi.fn(),
      },
    }));

    const mod = await import('@/lib/api');
    return { mod, instance, responseHandlers };
  }

  async function loadApiClientModule() {
    vi.resetModules();
    const instance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      defaults: { baseURL: '/api' },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    vi.doMock('axios', () => ({
      default: {
        create: vi.fn(() => instance),
        get: vi.fn(),
      },
    }));

    const mod = await import('@/lib/api/client');
    return { mod, instance };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('request wrapper unwraps one top-level data envelope', async () => {
    const { responseHandlers } = await loadApiModule();
    const fulfilled = responseHandlers[0]?.fulfilled;
    expect(typeof fulfilled).toBe('function');

    const result = fulfilled?.({ data: { data: { user: null } } });
    expect(result).toEqual({ user: null });
  });

  it('request wrapper unwraps list payload through top-level data envelope', async () => {
    const { responseHandlers } = await loadApiModule();
    const fulfilled = responseHandlers[0]?.fulfilled;
    expect(typeof fulfilled).toBe('function');

    const result = fulfilled?.({ data: { data: { items: [] } } });
    expect(result).toEqual({ items: [] });
  });

  it('request wrapper current 401 /auth/me behavior returns null', async () => {
    const { responseHandlers } = await loadApiModule();
    const rejected = responseHandlers[0]?.rejected;
    expect(typeof rejected).toBe('function');

    const result = await rejected?.({
      config: { url: '/auth/me', method: 'get' },
      response: { status: 401 },
    });
    expect(result).toBeNull();
  });

  it('apiClient wrapper returns response.data without unwrapping', async () => {
    const { mod, instance } = await loadApiClientModule();
    instance.get.mockResolvedValue({ data: { data: { user: null } } });

    const result = await mod.apiClient.get('/auth/me');
    expect(result).toEqual({ data: { user: null } });
  });

  it('proves drift: request and apiClient produce different /auth/me outputs', async () => {
    const { responseHandlers } = await loadApiModule();
    const requestFulfilled = responseHandlers[0]?.fulfilled;
    expect(typeof requestFulfilled).toBe('function');
    const requestResult = requestFulfilled?.({ data: { data: { user: null } } });

    const { mod, instance } = await loadApiClientModule();
    instance.get.mockResolvedValue({ data: { data: { user: null } } });
    const clientResult = await mod.apiClient.get('/auth/me');

    expect(requestResult).toEqual({ user: null });
    expect(clientResult).toEqual({ data: { user: null } });
    expect(clientResult).not.toEqual(requestResult);
  });
});
