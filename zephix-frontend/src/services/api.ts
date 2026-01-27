import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get API base URL
export const getApiBase = (): string => {
  return import.meta.env.PROD
    ? (import.meta.env.VITE_API_BASE_URL ?? 'https://zephix-backend-production.up.railway.app/api')
    : '/api';
};

/**
 * Enterprise API Client
 *
 * Features:
 * - Automatic token attachment from Zustand store
 * - Token refresh on 401
 * - Request/response logging in development
 * - Proper error handling
 * - Request retry logic
 * - Request cancellation support
 */

// Types
interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
}

// Authentication refresh queue system
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

interface AuthResponse {
  user: User;
  accessToken: string;
  organizationId: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  isEmailVerified: boolean;
  role: string;
}

interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: any;
}

// Get API base URL - use proxy in dev, full URL in prod
const getApiBaseUrl = (): string => {
  // In production, use VITE_API_URL if set, otherwise default to production URL
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'https://zephix-backend-production.up.railway.app/api';
  }
  // In development, use /api which is proxied by Vite
  return '/api';
};

// Create axios instance with enterprise configuration
const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30 seconds
  withCredentials: true, // Enable cookies for refresh tokens
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - cookies only, no token attachment
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // No Authorization header - cookies are sent automatically with withCredentials: true

    // CRITICAL FIX: Do NOT add x-workspace-id to auth, health, or version endpoints
    // These endpoints should not require workspace context
    const url = config.url || '';
    const isAuthEndpoint = url.includes('/api/auth') || url.includes('/auth/');
    const isHealthEndpoint = url.includes('/api/health') || url.includes('/health');
    const isVersionEndpoint = url.includes('/api/version') || url.includes('/version');
    const shouldSkipWorkspaceHeader = isAuthEndpoint || isHealthEndpoint || isVersionEndpoint;

    if (!shouldSkipWorkspaceHeader) {
      // Get workspace ID from centralized helper
      // Use dynamic import to avoid circular dependency
      let activeWorkspaceId: string | null = null;
      try {
        const { getActiveWorkspaceId } = await import('../utils/workspace');
        activeWorkspaceId = getActiveWorkspaceId();
      } catch (error) {
        // Fallback to direct store access if import fails
        const workspaceStorage = localStorage.getItem('workspace-storage');
        if (workspaceStorage) {
          try {
            const { state } = JSON.parse(workspaceStorage) as { state: { activeWorkspaceId: string | null } };
            activeWorkspaceId = state?.activeWorkspaceId || null;
          } catch (parseError) {
            console.warn('Failed to parse workspace storage:', parseError);
          }
        }
      }

      // Add x-workspace-id header if workspace is available
      // Do not send "default" - only send actual UUID
      if (activeWorkspaceId && activeWorkspaceId !== 'default') {
        config.headers['x-workspace-id'] = activeWorkspaceId;
      }
    }

    // Check if route requires workspace context
    const requiresWorkspace = url.startsWith('/work/') ||
                             url.startsWith('/projects/') ||
                             url.includes('/work/') ||
                             url.includes('/projects/');

    // For routes that require workspace, fail fast if no workspace selected
    if (requiresWorkspace && !activeWorkspaceId) {
      const error = new Error('Workspace required. Please select a workspace first.');
      (error as any).code = 'WORKSPACE_REQUIRED';
      return Promise.reject(error);
    }

    // Development logging
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      if (activeWorkspaceId) {
        console.log(`  Workspace: ${activeWorkspaceId}`);
      }
      if (config.data) {
        console.log('Request payload:', config.data);
      }
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`);
      console.error('Error details:', error.response?.data || error.message);
    }

    // No special handling for refresh endpoint - cookies handle it

    // Handle 401 Unauthorized - redirect to login (cookies handle refresh on backend)
    if (error.response?.status === 401 && originalRequest) {
      // Don't redirect if we're on an admin route - let AdminRoute handle it
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      const isLoginPage = window.location.pathname.includes('/login');
      
      if (!isLoginPage && !isAdminRoute) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Handle 403 Forbidden (email not verified)
    if (error.response?.status === 403) {
      const message = error.response.data?.message;
      if (typeof message === 'string' && message.includes('verify your email')) {
        // Don't redirect, let the UI handle this
        return Promise.reject(error);
      }
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded. Please wait before retrying.');
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error - API server may be down');
    }

    return Promise.reject(error);
  }
);

// Helper function to extract error message
export const getErrorMessage = (error: any): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;

    // Check if apiError exists and has a message property
    if (apiError && apiError.message) {
      // Handle nested message structure from backend
      // Backend sometimes returns { message: { message: "actual error", error: "type", statusCode: 400 } }
      if (typeof apiError.message === 'object' &&
          apiError.message !== null &&
          'message' in apiError.message) {
        return (apiError.message as any).message;
      }
      // If message is a string, return it directly
      if (typeof apiError.message === 'string') {
        return apiError.message;
      }
    }

    // Fallback messages based on status code
    if (error.response?.status === 404) return 'Resource not found';
    if (error.response?.status === 500) return 'Server error occurred';
    if (!error.response) return 'Network error - please check your connection';
  }

  return error?.message || 'An unexpected error occurred';
};

// Request cancellation support
export const createCancelToken = () => axios.CancelToken.source();

// Default export for backward compatibility
export default api;

// Named export for explicit usage
export { api };
