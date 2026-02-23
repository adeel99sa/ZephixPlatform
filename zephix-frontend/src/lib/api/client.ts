import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
// InternalAxiosRequestConfig is extended below via module augmentation (no import needed)

import { ApiResponse, StandardError, ApiClientConfig } from './types';

import { useWorkspaceStore } from '@/state/workspace.store';


// Extend Axios types to include our custom metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: { startTime: number };
  }
}

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

    // Use Vite proxy in dev (/api -> localhost:3000), full URL in prod
    const baseURL = import.meta.env.PROD
      ? (import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "https://zephix-backend-production.up.railway.app/api")
      : "/api"; // Relative path uses Vite proxy in development
    
    this.instance = axios.create({
      baseURL: baseURL,
      withCredentials: true,
    });
    this.setupInterceptors();
  }

  /** Keep CSRF token in-memory for cross-host staging setups. */
  private csrfTokenCache: string | null = null;
  private clearCsrfTokenCache(): void {
    this.csrfTokenCache = null;
  }

  private isCsrfError(error: AxiosError): boolean {
    const status = error.response?.status;
    const code = (error.response?.data as any)?.code;
    return (
      status === 403 &&
      (code === 'CSRF_TOKEN_MISSING' ||
        code === 'CSRF_INVALID' ||
        code === 'CSRF_TOKEN_MISMATCH')
    );
  }

  /** Fetch a fresh CSRF token from backend response body. */
  private csrfFetchPromise: Promise<string | null> | null = null;
  private async ensureCsrfToken(): Promise<string | null> {
    if (this.csrfTokenCache) return this.csrfTokenCache;

    if (this.csrfFetchPromise) return this.csrfFetchPromise;

    this.csrfFetchPromise = (async () => {
      try {
        const baseURL = this.instance.defaults.baseURL || '/api';
        const response = await axios.get(`${baseURL}/auth/csrf`, {
          withCredentials: true,
        });
        const token = (response.data as any)?.token || (response.data as any)?.csrfToken || null;
        this.csrfTokenCache = typeof token === 'string' && token.length > 0 ? token : null;
        return this.csrfTokenCache;
      } catch {
        return null;
      } finally {
        this.csrfFetchPromise = null;
      }
    })();

    return this.csrfFetchPromise;
  }

  private static MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      async (config) => {
        // NOTE: Do NOT normalize path here — baseURL already includes /api
        // baseURL is already set to '/api' in dev or full URL in prod.
        // Adding /api prefix in the interceptor would cause double-prefixing:
        // baseURL('/api') + normalizedUrl('/api/...') = '/api/api/...' = 404

        // No Authorization header - cookies are sent automatically with withCredentials: true

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

        // CSRF: attach token on every mutating request
        const url = config.url || '';
        const method = (config.method || 'get').toLowerCase();
        const isAuthEndpoint = url.includes('/api/auth') || url.includes('/auth/');
        const isHealthEndpoint = url.includes('/api/health') || url.includes('/health');
        const isCsrfBootstrapEndpoint = url.includes('/auth/csrf');

        if (
          ApiClient.MUTATING_METHODS.includes(method) &&
          !isHealthEndpoint &&
          !isCsrfBootstrapEndpoint
        ) {
          const csrfToken = await this.ensureCsrfToken();
          if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken;
          }
        }

        // CRITICAL FIX: Do NOT add x-workspace-id to auth, health, or version endpoints
        // These endpoints should not require workspace context
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
          } else {
            // STEP D: Set header only when activeWorkspaceId exists
            config.headers = config.headers || {};
            config.headers['X-Workspace-Id'] = wsId;
            config.headers['x-workspace-id'] = wsId; // Support both cases
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
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _csrfRetry?: boolean };
        const originalMethod = String(originalRequest?.method || '').toLowerCase();
        const originalUrl = String(originalRequest?.url || '');
        const isMutating = ApiClient.MUTATING_METHODS.includes(originalMethod);
        const isCsrfBootstrapEndpoint = originalUrl.includes('/auth/csrf');

        // CSRF token can rotate/expire. Refresh once, then retry one time.
        if (
          isMutating &&
          !isCsrfBootstrapEndpoint &&
          this.isCsrfError(error) &&
          !originalRequest?._csrfRetry
        ) {
          originalRequest._csrfRetry = true;
          this.clearCsrfTokenCache();
          await this.ensureCsrfToken();
          return this.instance(originalRequest);
        }

        // Handle 401 - try to refresh token (but not on auth routes)
        const isAuthRoute = (url: string) =>
          url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');

        if (error.response?.status === 401 && !isAuthRoute(originalRequest.url ?? '')) {
          // 401 means not authenticated - redirect to login
          // Cookies handle refresh on backend, so no client-side refresh needed
          this.handleAuthFailure();
          return Promise.reject(error);
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

  // Removed getAuthToken - using cookies only

  private getOrganizationId(): string | null {
    // This will be connected to the organization context later
    return localStorage.getItem('organization_id');
  }

  private getWorkspaceId(): string | null {
    // Get workspace ID from workspace store (workspace-storage)
    try {
      const workspaceStorage = localStorage.getItem('workspace-storage');
      if (workspaceStorage) {
        const { state } = JSON.parse(workspaceStorage);
        return state?.activeWorkspaceId || null;
      }
    } catch (error) {
      console.warn('Failed to get workspace ID from storage:', error);
    }
    return null;
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

  // Removed refreshToken - cookies handle refresh on backend

  private handleAuthFailure(): void {
    // Cleanup any legacy tokens dynamically to avoid circular deps
    import('@/auth/cleanupAuthStorage').then(({ cleanupLegacyAuthStorage }) => {
      cleanupLegacyAuthStorage();
    }).catch(() => { /* ignore cleanup failures */ });

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
    const errorData = error.response?.data as { message?: string } | undefined;
    const message = errorData?.message || error.message || 'An error occurred';

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

  // Removed token utility methods - using cookies only

  setOrganizationId(orgId: string): void {
    localStorage.setItem('organization_id', orgId);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
