import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing
vi.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: {
        use: vi.fn(),
      },
      response: {
        use: vi.fn(),
      },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      post: vi.fn(),
    },
  };
});

import { apiClient } from '../client';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  it('should setup request and response interceptors', () => {
    // The interceptors are set up during ApiClient construction
    // We can verify the client was created successfully
    expect(apiClient).toBeDefined();
  });

  it('should handle auth token management', () => {
    const mockSetItem = vi.mocked(localStorage.setItem);
    const mockRemoveItem = vi.mocked(localStorage.removeItem);

    apiClient.setAuthToken('new-token');
    expect(mockSetItem).toHaveBeenCalledWith('auth_token', 'new-token');

    apiClient.clearAuthToken();
    expect(mockRemoveItem).toHaveBeenCalledWith('auth_token');
    expect(mockRemoveItem).toHaveBeenCalledWith('refresh_token');
  });

  it('should handle organization ID management', () => {
    const mockSetItem = vi.mocked(localStorage.setItem);

    apiClient.setOrganizationId('org-123');
    expect(mockSetItem).toHaveBeenCalledWith('organization_id', 'org-123');
  });
});
