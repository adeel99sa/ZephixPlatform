import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useWorkspaceStore } from '@/state/workspace.store';

import { ApiResponse, StandardError, ApiClientConfig } from './types';

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

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Normalize URL to exactly one /api prefix
        config.url = normalizeApiPath(config.url);

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
    // Cleanup any legacy tokens
    const { cleanupLegacyAuthStorage } = require('@/auth/cleanupAuthStorage');
    cleanupLegacyAuthStorage();

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

  // Removed token utility methods - using cookies only

  setOrganizationId(orgId: string): void {
    localStorage.setItem('organization_id', orgId);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
