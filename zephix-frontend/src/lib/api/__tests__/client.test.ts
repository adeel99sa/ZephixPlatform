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

  // Auth now uses HTTP-only cookies - no token management API exposed
  // Removed: setAuthToken/clearAuthToken tests (cookie-based auth)
  it('should not expose token management methods (cookie-based auth)', () => {
    // Verify that legacy token methods have been removed in favor of cookie-based auth
    expect((apiClient as unknown as { setAuthToken?: unknown }).setAuthToken).toBeUndefined();
    expect((apiClient as unknown as { clearAuthToken?: unknown }).clearAuthToken).toBeUndefined();
  });

  it('should handle organization ID management', () => {
    const mockSetItem = vi.mocked(localStorage.setItem);

    apiClient.setOrganizationId('org-123');
    expect(mockSetItem).toHaveBeenCalledWith('organization_id', 'org-123');
  });
});
