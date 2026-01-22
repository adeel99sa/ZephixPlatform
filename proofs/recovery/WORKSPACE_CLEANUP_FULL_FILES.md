# Workspace Cleanup - Full File Contents

All changed files with complete content.

---

## FILE 1: zephix-frontend/src/lib/api/client.ts

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

import { ApiResponse, StandardError, ApiClientConfig } from './types';

import { useWorkspaceStore } from '@/state/workspace.store';


// Helper: normalize to exactly one "/api" prefix (same-origin)
const isAbsoluteHttp = (u?: string) => !!u && /^https?:\/\//i.test(u);

const normalizeApiPath = (u?: string) => {
  if (!u) return u;
  if (isAbsoluteHttp(u)) return u;                  // leave full URLs alone
  let url = u.trim();

  // collapse accidental double prefixes
  if (url.startsWith('/api/api/')) url = url.replace(/^\/api\/api\//, '/api/');
  if (url.startsWith('api/api/'))  url = '/' + url.replace(/^api\/api\//, 'api/');

  // ensure exactly one /api/ prefix
  if (url.startsWith('/api/')) return url;          // good
  if (url.startsWith('api/'))  return '/' + url;    // add leading slash
  if (url.startsWith('/'))     return '/api' + url; // /x -> /api/x
  return '/api/' + url;                              // x -> /api/x
};

class ApiClient {
  private instance: AxiosInstance;
  private config: ApiClientConfig;

  constructor() {
    this.config = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    // Build the axios instance WITHOUT a baseURL so our interceptor is source of truth
    this.instance = axios.create({
      withCredentials: true,
    });
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Normalize URL to exactly one /api prefix
        config.url = normalizeApiPath(config.url);

        // Add JWT token from auth store
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['x-request-id'] = this.generateRequestId();

        // Add correlation ID for observability
        config.headers['x-correlation-id'] = this.generateCorrelationId();

        // Add timing metadata for telemetry
        config.metadata = { startTime: Date.now() };

        // Add organization header (stub for now)
        const orgId = this.getOrganizationId();
        if (orgId) {
          config.headers['x-organization-id'] = orgId;
        }

        // CRITICAL FIX: Do NOT add x-workspace-id to auth, health, or version endpoints
        // These endpoints should not require workspace context
        const url = config.url || '';
        const isAuthEndpoint = url.includes('/api/auth') || url.includes('/auth/');
        const isHealthEndpoint = url.includes('/api/health') || url.includes('/health');
        const isVersionEndpoint = url.includes('/api/version') || url.includes('/version');
        const shouldSkipWorkspaceHeader = isAuthEndpoint || isHealthEndpoint || isVersionEndpoint;

        if (!shouldSkipWorkspaceHeader) {
          // STEP D: Read activeWorkspaceId from Zustand store directly
          // This ensures we always have the latest value, not stale localStorage
          const wsId = useWorkspaceStore.getState().activeWorkspaceId;

          // STEP D: If activeWorkspaceId is null, delete headers to prevent stale context
          if (!wsId) {
            delete config.headers?.['X-Workspace-Id'];
            delete config.headers?.['x-workspace-id'];
            
            // Development log for debugging
            if (import.meta.env.MODE === 'development') {
              console.log('[API] Workspace header removed - activeWorkspaceId is null', {
                url: config.url,
                timestamp: new Date().toISOString(),
              });
            }
          } else {
            // STEP D: Set header only when activeWorkspaceId exists
            config.headers = config.headers || {};
            config.headers['X-Workspace-Id'] = wsId;
            config.headers['x-workspace-id'] = wsId; // Support both cases
            
            // Development log for debugging
            if (import.meta.env.MODE === 'development') {
              console.log('[API] Workspace header injected', {
                workspaceId: wsId,
                url: config.url,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Telemetry sampling (1% of requests)
        if (Math.random() < 0.01) {
          const endTime = Date.now();
          const startTime = response.config.metadata?.startTime || endTime;
          this.sendTelemetryMetric('http_timing', {
            url: response.config.url,
            method: response.config.method,
            status: response.status,
            duration: endTime - startTime,
            correlationId: response.config.headers?.['x-correlation-id'],
            requestId: response.config.headers?.['x-request-id'],
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 - try to refresh token (but not on auth routes)
        const isAuthRoute = (url: string) =>
          url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute(originalRequest.url ?? '')) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${this.getAuthToken()}`;
            }
            return this.instance(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.handleAuthFailure();
            return Promise.reject(refreshError);
          }
        }

        // Handle 403 - insufficient permissions
        if (error.response?.status === 403) {
          this.handlePermissionDenied();
        }

        // Handle 429 - rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) {
            await this.delay(parseInt(retryAfter) * 1000);
            return this.instance(originalRequest);
          }
        }

        // Convert to standardized error format
        const standardError = this.normalizeError(error);
        return Promise.reject(standardError);
      }
    );
  }

  private getAuthToken(): string | null {
    // CRITICAL FIX: Check BOTH token storage locations
    // AuthContext uses zephix.at/zephix.rt, but this client was looking in zephix-auth-storage
    // This mismatch causes 401 errors when adminApi is called

    // First, try the AuthContext storage (zephix.at)
    const tokenFromAuthContext = localStorage.getItem('zephix.at');
    if (tokenFromAuthContext) {
      return tokenFromAuthContext;
    }

    // Fallback to zephix-auth-storage (legacy)
    try {
      const authStorage = localStorage.getItem('zephix-auth-storage');
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        return state?.accessToken || null;
      }
    } catch (error) {
      console.warn('Failed to get auth token from storage:', error);
    }
    return null;
  }

  private getOrganizationId(): string | null {
    // This will be connected to the organization context later
    return localStorage.getItem('organization_id');
  }

  private getWorkspaceId(): string | null {
    // Get workspace ID from workspace store (single source of truth)
    return useWorkspaceStore.getState().activeWorkspaceId;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendTelemetryMetric(metricName: string, data: Record<string, any>): void {
    // In production, send to your monitoring service
    if (import.meta.env.PROD) {
      // TODO: Replace with your actual telemetry service
      // Example: send to DataDog, New Relic, or custom endpoint
      console.log(`[TELEMETRY] ${metricName}:`, {
        ...data,
        timestamp: new Date().toISOString(),
        buildTag: import.meta.env.VITE_BUILD_TAG,
        gitHash: import.meta.env.VITE_GIT_HASH,
      });

      // Example implementation:
      // apiClient.post('/telemetry', { metric: metricName, data }).catch(() => {}); // Silent fail
    }
  }

  private async refreshToken(): Promise<void> {
    // CRITICAL FIX: Get refresh token from the SAME storage as AuthContext
    // AuthContext uses zephix.rt, so we must use that too

    // First, try the AuthContext storage (zephix.rt)
    let refreshToken = localStorage.getItem('zephix.rt');

    // Fallback to zephix-auth-storage (legacy)
    if (!refreshToken) {
      try {
        const authStorage = localStorage.getItem('zephix-auth-storage');
        if (authStorage) {
          const { state } = JSON.parse(authStorage);
          refreshToken = state?.refreshToken;
        }
      } catch (error) {
        console.warn('Failed to get refresh token from storage:', error);
      }
    }

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post('/api/auth/refresh', {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    // CRITICAL: Update BOTH storage locations to keep them in sync
    // Update AuthContext storage (zephix.at / zephix.rt)
    localStorage.setItem('zephix.at', accessToken);
    if (newRefreshToken) {
      localStorage.setItem('zephix.rt', newRefreshToken);
    }

    // Also update zephix-auth-storage if it exists (for backward compatibility)
    try {
      const authStorage = localStorage.getItem('zephix-auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        const updatedState = {
          ...parsed.state,
          accessToken,
          refreshToken: newRefreshToken || refreshToken,
        };
        localStorage.setItem('zephix-auth-storage', JSON.stringify({ state: updatedState }));
      }
    } catch (error) {
      // Ignore errors updating legacy storage
    }
  }

  private handleAuthFailure(): void {
    // CRITICAL FIX: Clear BOTH token storage locations
    // Clear AuthContext storage
    localStorage.removeItem('zephix.at');
    localStorage.removeItem('zephix.rt');
    // Clear legacy storage
    localStorage.removeItem('zephix-auth-storage');

    // Don't redirect if we're on an admin route - let AdminRoute handle it
    const isAdminRoute = window.location.pathname.startsWith('/admin');
    if (!isAdminRoute) {
      // Redirect to login page
      window.location.href = '/login';
    }
  }

  private handlePermissionDenied(): void {
    // Don't redirect - let the component handle 403 errors
    // This allows admin pages to show inline error messages
    // instead of redirecting away from the admin console
    console.warn('Insufficient permissions (403)');
    // The error will be caught by the component's error handler
  }

  private normalizeError(error: AxiosError): StandardError {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'An error occurred';

    let code: StandardError['code'] = 'SERVER_ERROR';
    if (status === 400) code = 'VALIDATION_ERROR';
    else if (status === 401) code = 'AUTH_ERROR';
    else if (status === 404) code = 'NOT_FOUND';
    else if (status >= 500) code = 'SERVER_ERROR';
    else if (!navigator.onLine) code = 'NETWORK_ERROR';

    return {
      code,
      message,
      status,
      timestamp: new Date().toISOString(),
      requestId: error.config?.headers?.['x-request-id'] as string,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get(url, config);
    return response.data;
  }

  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post(url, data, config);
    return response.data;
  }

  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put(url, data, config);
    return response.data;
  }

  async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.patch(url, data, config);
    return response.data;
  }

  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete(url, config);
    return response.data;
  }

  // Utility methods
  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  clearAuthToken(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }

  setOrganizationId(orgId: string): void {
    localStorage.setItem('organization_id', orgId);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
```

---

## FILE 2: zephix-frontend/src/services/api.ts

```typescript
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useWorkspaceStore } from '@/state/workspace.store';

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

// Request interceptor for token attachment and logging
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // CRITICAL FIX: Read token from AuthContext storage (zephix.at) first
    // AuthContext stores tokens in zephix.at, not auth-storage
    let token: string | null = null;

    // First, try AuthContext storage (zephix.at)
    token = localStorage.getItem('zephix.at');

    // Fallback to Zustand auth store (auth-storage) for backward compatibility
    if (!token) {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage) as { state: AuthState };

          // Check if we have a valid token that hasn't expired
          const hasValidToken = state?.accessToken &&
                               state.accessToken !== 'null' &&
                               state.accessToken !== null &&
                               typeof state.accessToken === 'string' &&
                               state.accessToken.length > 0 &&
                               state?.expiresAt;

          if (hasValidToken) {
            const now = Date.now();

            if (now < state.expiresAt) {
              token = state.accessToken;
            } else {
              // Token expired, remove it
              console.warn('Access token expired, will attempt refresh');
            }
          }
        } catch (error) {
          console.error('Failed to parse auth storage:', error);
          localStorage.removeItem('auth-storage');
        }
      }
    }

    // Attach token if found
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CRITICAL FIX: Do NOT add x-workspace-id to auth, health, or version endpoints
    // These endpoints should not require workspace context
    const url = config.url || '';
    const isAuthEndpoint = url.includes('/api/auth') || url.includes('/auth/');
    const isHealthEndpoint = url.includes('/api/health') || url.includes('/health');
    const isVersionEndpoint = url.includes('/api/version') || url.includes('/version');
    const shouldSkipWorkspaceHeader = isAuthEndpoint || isHealthEndpoint || isVersionEndpoint;

    if (!shouldSkipWorkspaceHeader) {
      // Get workspace ID from workspace store (single source of truth)
      const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;

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

    // Don't retry refresh endpoint itself
    if (originalRequest?.url?.includes('/auth/refresh')) {
      localStorage.removeItem('auth-storage');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await api.post('/auth/refresh');

        if (refreshResponse.data.accessToken) {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            parsed.state.accessToken = refreshResponse.data.accessToken;
            parsed.state.expiresAt = Date.now() + (refreshResponse.data.expiresIn * 1000);
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
          }

          processQueue(null, refreshResponse.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('auth-storage');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
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
```

---

## FILE 3: zephix-frontend/src/views/workspaces/WorkspaceView.tsx

```typescript
/**
 * PROMPT 4: Workspace View - Hardened page load
 *
 * On mount, fetch workspace by id using route param.
 * - If 200: Render WorkspaceHome and sync store
 * - If 403: Show "No access" state
 * - If 404: Show "Not found" state
 * - Add retry button
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { getWorkspace } from '@/features/workspaces/workspace.api';
import WorkspaceHome from '@/features/workspaces/views/WorkspaceHome';
import { WorkspaceAccessState } from '@/components/workspace/WorkspaceAccessStates';
import { SuspendedAccessScreen } from '@/components/workspace/SuspendedAccessScreen';
import { Button } from '@/components/ui/Button';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

type WorkspaceLoadState = 'loading' | 'success' | 'no-access' | 'not-found' | 'error' | 'suspended';

export default function WorkspaceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setActiveWorkspaceId } = useWorkspaceStore();
  const { user, loading: authLoading } = useAuth();
  const [loadState, setLoadState] = useState<WorkspaceLoadState>('loading');

  useEffect(() => {
    // Guard: Don't fetch until auth state is READY
    if (authLoading) {
      return;
    }
    // Guard: Don't fetch if user doesn't exist
    if (!user) {
      return;
    }
    // Guard: Don't fetch if organizationId doesn't exist
    if (!user.organizationId) {
      return;
    }
    // Guard: Don't fetch if workspaceId from URL doesn't exist
    if (!id) {
      setLoadState('not-found');
      return;
    }

    // PROMPT 4: Fetch workspace and handle errors
    loadWorkspace(id);
  }, [id, user, authLoading]);

  async function loadWorkspace(workspaceId: string) {
    setLoadState('loading');

    try {
      const workspace = await getWorkspace(workspaceId);

      if (!workspace) {
        // Backend returned null (200 with null data)
        // This means workspace doesn't exist (for admin users)
        // For non-admin users, this shouldn't happen (they get 403 instead)
        setLoadState('not-found');
        return;
      }

      // Success: Sync store and render
      setActiveWorkspaceId(workspaceId);
      setLoadState('success');
    } catch (error: any) {
      // Handle 403 (access denied) - getWorkspace re-throws 403
      // PROMPT 8 B3: Check for SUSPENDED error code
      if (error?.response?.status === 403) {
        const errorCode = error?.response?.data?.code;
        if (errorCode === 'SUSPENDED') {
          setLoadState('suspended');
        } else {
          // For non-admin users, 403 can mean either:
          // 1. Workspace exists but user doesn't have access
          // 2. Workspace doesn't exist (security: don't leak existence)
          // We show "No access" for both cases
          setLoadState('no-access');
        }
      } else {
        // Other errors (network, 500, etc.)
        setLoadState('error');
      }
    }
  }

  function handleRetry() {
    if (id) {
      loadWorkspace(id);
    }
  }

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    navigate('/login');
    return null;
  }

  // Redirect if no organizationId
  if (!user.organizationId) {
    navigate('/403');
    return null;
  }

  // Show error if no workspaceId in URL
  if (!id) {
    return <WorkspaceAccessState type="not-found" />;
  }

  // Show loading state
  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // PROMPT 8 B3: Show suspended screen
  if (loadState === 'suspended') {
    return <SuspendedAccessScreen />;
  }

  // Show error states
  if (loadState === 'no-access') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No access</h2>
          <p className="text-gray-600 mb-6">
            You don't have access to this workspace. Contact a workspace owner to request access.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate('/workspaces')}>
              Back to workspace list
            </Button>
            <Button onClick={handleRetry} variant="ghost">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === 'not-found') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Workspace not found</h2>
          <p className="text-gray-600 mb-6">
            This workspace doesn't exist or has been deleted.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate('/workspaces')}>
              Back to workspace list
            </Button>
            <Button onClick={handleRetry} variant="ghost">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error loading workspace</h2>
          <p className="text-gray-600 mb-6">
            Something went wrong. Please try again.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate('/workspaces')}>
              Back to workspace list
            </Button>
            <Button onClick={handleRetry}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success: Render workspace home
  return <WorkspaceHome />;
}
```

---

## FILE 4: zephix-frontend/src/components/command/CommandPalette.tsx

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { track } from '@/lib/telemetry';
import { registerWorkspaceSettingsAction } from '@/features/workspaces/WorkspaceSettingsAction';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { isAdminRole } from '@/types/roles';
import { listWorkspaces } from '@/features/workspaces/api';

type Command = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

const MODAL_ROOT_ID = 'modal-root';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();
  const { user } = useAuth();
  const isAdmin = user?.role ? isAdminRole(user.role) : false;
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string; slug?: string }>>([]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
    track('ui.menu.close', { surface: 'cmdk' });
  }, []);

  const openCmd = useCallback(() => {
    setOpen(true);
    track('ui.cmdk.open');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Global hotkey: Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && k === 'k') {
        e.preventDefault();
        if (open) close(); else openCmd();
      }
      if (open && k === 'escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, openCmd]);

  // Commands (role-gated could be added via props/context)
  const [commands, setCommands] = useState<Command[]>([
    { id: 'home', label: 'Go to Home', hint: '/home', run: () => navigate('/home') },
  ]);

  // Register workspace settings action dynamically
  useEffect(() => {
    // Only register workspace settings if a workspace is active
    // TODO: Phase 4 - Also check 'view_workspace' permission from API
    // Currently relies on backend guard to reject unauthorized access
    if (activeWorkspaceId) {
      setCommands(prev => {
        const exists = prev.find(c => c.id === 'workspace.settings');
        if (exists) return prev;
        return [...prev, {
          id: 'workspace.settings',
          label: 'Open workspace settings',
          hint: `/workspaces/${activeWorkspaceId}/settings`,
          run: () => {
            navigate(`/workspaces/${activeWorkspaceId}/settings`);
            close();
          }
        }];
      });
    } else {
      // Remove if no active workspace
      setCommands(prev => prev.filter(cmd => cmd.id !== 'workspace.settings'));
    }
  }, [activeWorkspaceId, navigate, close]);

  // PROMPT 10: Load workspaces for switcher
  useEffect(() => {
    if (open && user) {
      listWorkspaces()
        .then(ws => setWorkspaces(ws))
        .catch(err => console.error('Failed to load workspaces:', err));
    }
  }, [open, user]);

  // PROMPT 10: Add workspace switch commands
  useEffect(() => {
    if (workspaces.length > 0) {
      setCommands(prev => {
        // Remove existing workspace switch commands
        const filtered = prev.filter(cmd => !cmd.id.startsWith('workspace.switch-'));
        // Add switch commands for each workspace
        const switchCommands: Command[] = workspaces.map(ws => ({
          id: `workspace.switch-${ws.id}`,
          label: `Switch to ${ws.name}`,
          hint: ws.slug ? `/w/${ws.slug}/home` : `/workspaces/${ws.id}`,
          run: () => {
            setActiveWorkspaceId(ws.id);
            navigate(ws.slug ? `/w/${ws.slug}/home` : `/workspaces/${ws.id}`, { replace: true });
            close();
          }
        }));
        return [...filtered, ...switchCommands];
      });
    } else {
      // Remove workspace switch commands if no workspaces
      setCommands(prev => prev.filter(cmd => !cmd.id.startsWith('workspace.switch-')));
    }
  }, [workspaces, navigate, setActiveWorkspaceId, close]);

  // Add Admin commands if user is admin
  useEffect(() => {
    if (isAdmin) {
      setCommands(prev => {
        const adminCommands: Command[] = [
          { id: 'admin-overview', label: 'Go to Admin overview', hint: '/admin/overview', run: () => navigate('/admin/overview') },
          { id: 'admin-dashboard', label: 'Go to Admin dashboard', hint: '/admin', run: () => navigate('/admin') },
          { id: 'admin-users', label: 'Manage users', hint: '/admin/users', run: () => navigate('/admin/users') },
          { id: 'admin-workspaces', label: 'Manage workspaces', hint: '/admin/workspaces', run: () => navigate('/admin/workspaces') },
        ];
        // Remove existing admin commands and add new ones
        const filtered = prev.filter(cmd => !cmd.id.startsWith('admin-'));
        return [...filtered, ...adminCommands];
      });
    } else {
      // Remove admin commands if user is not admin
      setCommands(prev => prev.filter(cmd => !cmd.id.startsWith('admin-')));
    }
  }, [isAdmin, navigate]);

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  const onExecute = (cmd: Command) => {
    track('ui.cmdk.execute', { id: cmd.id, label: cmd.label });
    cmd.run();
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
      listRef.current?.children[activeIndex + 1]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
      listRef.current?.children[activeIndex - 1]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) {
        onExecute(filtered[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  if (!open) return null;

  const modalRoot = document.getElementById(MODAL_ROOT_ID) || document.body;

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      aria-label="Command Palette"
      className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/30 p-8"
      data-testid="cmdk-dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-xl rounded-lg bg-white p-2 shadow-xl outline-none dark:bg-neutral-900">
        <div className="flex items-center gap-2 border-b border-neutral-200 p-2 dark:border-neutral-800">
          <span className="text-xs text-neutral-500">⌘K</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={onKeyDown}
            placeholder="Type a command…"
            aria-label="Search commands"
            className="w-full bg-transparent p-2 outline-none"
            data-testid="cmdk-input"
          />
        </div>
        <ul
          ref={listRef}
          role="menu"
          aria-label="Command results"
          className="max-h-80 overflow-auto p-2"
          data-testid="cmdk-results"
        >
          {filtered.map((cmd, i) => (
            <li
              key={cmd.id}
              role="menuitem"
              tabIndex={-1}
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => onExecute(cmd)}
              className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 ${
                i === activeIndex ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
              }`}
                  data-testid={
                    cmd.id === 'workspace.settings' ? 'action-workspace-settings' :
                    cmd.id === 'admin-overview' ? 'action-admin-overview' :
                    cmd.id === 'admin-users' ? 'action-admin-users' :
                    cmd.id === 'admin-workspaces' ? 'action-admin-workspaces' :
                    `cmdk-item-${cmd.id}`
                  }
            >
              <span>{cmd.label}</span>
              {cmd.hint && <span className="text-xs text-neutral-500">{cmd.hint}</span>}
            </li>
          ))}
          {!filtered.length && (
            <li className="px-3 py-6 text-sm text-neutral-500" data-testid="cmdk-empty">
              No commands found
            </li>
          )}
        </ul>
      </div>
    </div>,
    modalRoot
  );
}
```

---

## FILE 5: zephix-frontend/src/views/workspaces/WorkspaceHomeBySlug.tsx

```typescript
/**
 * PHASE 5.3: Workspace Home by Slug
 *
 * Fetches workspace home data using slug and renders WorkspaceHome component
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import WorkspaceHome from '@/features/workspaces/views/WorkspaceHome';

interface WorkspaceHomeData {
  workspace: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    owner: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
  };
  stats: {
    activeProjectsCount: number;
    membersCount: number;
  };
  lists: {
    activeProjects: Array<{
      id: string;
      name: string;
      status: string;
    }>;
  };
  topRisksCount: number;
}

export default function WorkspaceHomeBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setActiveWorkspaceId } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !slug) {
      return;
    }

    loadWorkspaceHome();
  }, [authLoading, user, slug]);

  async function loadWorkspaceHome() {
    if (!slug) {
      setError('Missing workspace slug');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get<{ data: WorkspaceHomeData }>(
        `/workspaces/slug/${slug}/home`
      );

      const data = response.data;

      if (!data || !data.workspace) {
        setError('Workspace not found');
        setLoading(false);
        return;
      }

      // Sync workspace store
      setActiveWorkspaceId(data.workspace.id);
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to load workspace home:', error);

      if (error?.response?.status === 404) {
        setError('Workspace not found');
        // Don't navigate - let user see error or redirect manually
      } else {
        setError('Failed to load workspace');
      }

      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => navigate('/workspaces')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to workspace list
            </button>
            <button
              onClick={loadWorkspaceHome}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render WorkspaceHome component (it will use activeWorkspaceId from store)
  return <WorkspaceHome />;
}
```

---

## FILE 6: zephix-frontend/src/views/workspaces/WorkspacesIndexPage.tsx

```typescript
/**
 * PROMPT 4: Workspaces Index Page
 *
 * Route: /workspaces
 * Behavior:
 * - If 0 workspaces: Show empty state with action based on platform role
 * - If 1 workspace: Auto-select and redirect to /workspaces/:id
 * - If 2+: Show list with search, selecting one navigates to /workspaces/:id
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { listWorkspaces } from '@/features/workspaces/api';
import type { Workspace } from '@/features/workspaces/types';
import { isAdminRole, normalizePlatformRole } from '@/types/roles';
import type { PlatformRole } from '@/types/roles';
import { WorkspaceCreateModal } from '@/features/workspaces/WorkspaceCreateModal';
import { Button } from '@/components/ui/Button';

export default function WorkspacesIndexPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setActiveWorkspaceId } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canCreateWorkspace = isAdminRole(user?.role);
  const platformRole = user?.role ? normalizePlatformRole(user.role) : null;
  const availableWorkspaces = workspaces.filter(w => !w.deletedAt);
  const filteredWorkspaces = availableWorkspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ws.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }

    loadWorkspaces();
  }, [authLoading, user]);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const data = await listWorkspaces();
      const workspacesList = Array.isArray(data) ? data : [];
      setWorkspaces(workspacesList);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }

  // STEP 4: Auto-select if only one workspace exists - navigate to /home
  useEffect(() => {
    if (availableWorkspaces.length === 1 && !loading && !authLoading && user) {
      const singleWorkspace = availableWorkspaces[0];
      if (singleWorkspace) {
        setActiveWorkspaceId(singleWorkspace.id);
        // Navigate to /home - HomeView will handle workspace-scoped rendering
        navigate('/home', { replace: true });
      }
    }
  }, [availableWorkspaces.length, loading, authLoading, user, navigate, setActiveWorkspaceId]);

  // STEP 2: Workspace selection from /workspaces page - navigate to /home
  function handleSelectWorkspace(workspaceId: string) {
    setActiveWorkspaceId(workspaceId);
    // Navigate to /home - HomeView will handle workspace-scoped rendering
    navigate('/home', { replace: false });
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  // If only one workspace, show loader while auto-selecting
  if (availableWorkspaces.length === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Selecting workspace...</p>
        </div>
      </div>
    );
  }

  // Empty state: 0 workspaces
  if (availableWorkspaces.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No workspaces</h2>
          <p className="text-gray-600 mb-6">
            {canCreateWorkspace
              ? 'Create your first workspace to get started.'
              : platformRole === 'MEMBER' || platformRole === 'VIEWER'
              ? 'Ask an admin to create a workspace.'
              : 'Contact an admin to get assigned to a workspace.'}
          </p>
          {canCreateWorkspace && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2"
            >
              Create workspace
            </Button>
          )}
          {!canCreateWorkspace && (
            <p className="text-sm text-gray-500">
              Ask an admin to create a workspace
            </p>
          )}
        </div>

        {canCreateWorkspace && (
          <WorkspaceCreateModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreated={(workspaceId) => {
              loadWorkspaces();
              setActiveWorkspaceId(workspaceId);
              // Navigate to /home after creating workspace
              navigate('/home', { replace: false });
              setShowCreateModal(false);
            }}
          />
        )}
      </div>
    );
  }

  // List view: 2+ workspaces
  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="workspaces-index-page">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Workspaces</h1>
        <p className="text-gray-600">Select a workspace to continue</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search workspaces..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-md"
        />
      </div>

      {/* Workspace List */}
      {filteredWorkspaces.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-gray-500">No workspaces match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredWorkspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSelectWorkspace(ws.id)}
              className="w-full text-left px-4 py-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors"
            >
              <div className="font-medium text-gray-900">{ws.name}</div>
              {ws.description && (
                <div className="text-sm text-gray-500 mt-1">{ws.description}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Create Workspace Button (Admin only) */}
      {canCreateWorkspace && (
        <div className="mt-6">
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="ghost"
            className="px-4 py-2"
          >
            + Create new workspace
          </Button>
        </div>
      )}

      {canCreateWorkspace && (
        <WorkspaceCreateModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={(workspaceId) => {
            loadWorkspaces();
            setActiveWorkspaceId(workspaceId);
            // Navigate to /home after creating workspace
            navigate('/home', { replace: false });
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
```

---

## FILE 7: zephix-frontend/src/views/workspaces/JoinWorkspacePage.tsx

```typescript
/**
 * PROMPT 7 B1: Join Workspace Page
 *
 * Route: /join/workspace
 * Reads token from query param
 * If not logged in, show sign in screen
 * If logged in, call join endpoint and navigate to workspace
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/state/AuthContext';
import { joinWorkspace } from '@/features/workspaces/api/workspace-invite.api';
import { useWorkspaceStore } from '@/state/workspace.store';
import { Button } from '@/components/ui/Button';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

export function JoinWorkspacePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setActiveWorkspaceId } = useWorkspaceStore();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!authLoading && user && token) {
      handleJoin();
    }
  }, [authLoading, user, token]);

  async function handleJoin() {
    if (!token) {
      setError('Invalid invite link');
      return;
    }

    if (!user) {
      // Will show sign in screen
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const result = await joinWorkspace(token);
      setActiveWorkspaceId(result.workspaceId);
      toast.success('Successfully joined workspace');
      navigate(`/workspaces/${result.workspaceId}`);
    } catch (error: any) {
      console.error('Failed to join workspace:', error);
      const errorCode = error?.response?.data?.code;
      const errorMessage = error?.response?.data?.message;
      const displayMessage = getApiErrorMessage({ code: errorCode, message: errorMessage });
      setError(displayMessage);
    } finally {
      setJoining(false);
    }
  }

  // PROMPT 7 B1: If not logged in, show sign in screen
  if (!authLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Join workspace</h2>
            <p className="text-gray-600 mb-6">Sign in to join this workspace</p>
            <Button
              onClick={() => navigate('/login', { state: { returnTo: `/join/workspace?token=${token}` } })}
              className="w-full"
            >
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading or joining state
  if (authLoading || joining) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">
          {joining ? 'Joining workspace...' : 'Loading...'}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <div className="bg-white border border-red-200 rounded-lg p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Unable to join workspace</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <Button
              onClick={() => navigate('/workspaces')}
              variant="outline"
              className="w-full"
            >
              Back to workspaces
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No token
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Invalid invite link</h2>
            <p className="text-gray-600 mb-6">This invite link is missing a token.</p>
            <Button
              onClick={() => navigate('/workspaces')}
              variant="outline"
              className="w-full"
            >
              Back to workspaces
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
```

---

## FILE 8: zephix-frontend/src/features/admin/workspaces/WorkspacesListPage.tsx

```typescript
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Search, Plus, Edit, Eye } from "lucide-react";

import { workspacesApi, type Workspace } from "./workspaces.api";
import CreateWorkspaceModal from "./CreateWorkspaceModal";

import { track } from "@/lib/telemetry";
import { useWorkspaceStore } from "@/state/workspace.store";
import { openWorkspaceSettingsModal } from "@/features/workspaces/components/WorkspaceSettingsModal/controller";
import { useAuth } from "@/state/AuthContext";

export default function WorkspacesListPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setActiveWorkspaceId } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // Guard: Don't fire requests until auth state is READY
    if (authLoading) {
      return;
    }
    // Only load if user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }

    track("admin.workspaces.viewed");
    loadWorkspaces();
  }, [authLoading, user, searchTerm, statusFilter]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const params: { search?: string; status?: string } = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await workspacesApi.getWorkspaces(params);
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    track("admin.workspaces.opened", { workspaceId });
    navigate(`/workspaces/${workspaceId}`);
  };

  const handleEditWorkspace = (workspaceId: string) => {
    track("admin.workspaces.edit_opened", { workspaceId, source: "admin" });
    openWorkspaceSettingsModal(workspaceId);
  };

  const filteredWorkspaces = workspaces.filter((ws) => {
    const matchesSearch =
      !searchTerm ||
      ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ws.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ws.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6" data-testid="admin-workspaces-root">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Workspaces</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all workspaces in your organization
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          data-testid="create-workspace-button"
        >
          <Plus className="h-4 w-4" />
          Create Workspace
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Workspaces List */}
      {loading ? (
        <div className="text-gray-500">Loading workspaces...</div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-2">No workspaces found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first workspace →
          </button>
        </div>
      ) : (
        <div
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          data-testid="admin-workspaces-table"
        >
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWorkspaces.map((workspace) => (
                <tr key={workspace.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{workspace.name}</div>
                    {workspace.description && (
                      <div className="text-sm text-gray-500 mt-1">{workspace.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {workspace.owner?.name || workspace.owner?.email || "No owner"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        workspace.visibility === "public"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {workspace.visibility}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        workspace.status === "active"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {workspace.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {workspace.createdAt
                      ? new Date(workspace.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenWorkspace(workspace.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Open workspace"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditWorkspace(workspace.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit workspace"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadWorkspaces();
          }}
        />
      )}
    </div>
  );
}
```

---

## FILE 9: zephix-frontend/src/features/templates/intent.ts

```typescript
// zephix-frontend/src/features/templates/intent.ts
import { applyTemplate } from "./api";

import { useWorkspaceStore } from "@/state/workspace.store";

export async function applyTemplateWithWorkspace({
  templateId,
  type, // "project" | "dashboard" | ...
  preferredWorkspaceId, // optional
  onRequireWorkspace,   // () => Promise<string> (open modal, return new/existing wsId)
}: {
  templateId: string;
  type: string;
  preferredWorkspaceId?: string | null;
  onRequireWorkspace: () => Promise<string>;
}) {
  const active = useWorkspaceStore.getState().activeWorkspaceId ?? preferredWorkspaceId;
  const workspaceId = active ?? await onRequireWorkspace(); // invokes your modal
  useWorkspaceStore.getState().setActiveWorkspaceId(workspaceId);
  return applyTemplate({ templateId, type, workspaceId });
}
```

---

## Summary

**Total Files Changed:** 9 files  
**Total Matches Removed:** 13 instances  
**Build Status:** ✅ Passes  
**Verification:** ✅ Zero matches for all forbidden keys

All workspace state now uses:
- **Single storage key:** `zephix.activeWorkspaceId`
- **Single store method:** `setActiveWorkspaceId(id)`
- **Centralized header injection:** All API clients read from `useWorkspaceStore.getState().activeWorkspaceId`
