import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

import { ApiResponse, StandardError, ApiClientConfig } from './types';

class ApiClient {
  private instance: AxiosInstance;
  private config: ApiClientConfig;
  private tokenGetter?: () => string | null;

  constructor() {
    this.config = {
      baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://zephix-backend-production.up.railway.app/api' : '/api'),
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    this.instance = axios.create(this.config);
    this.setupInterceptors();
  }

  setTokenGetter(tokenGetter: () => string | null): void {
    this.tokenGetter = tokenGetter;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add JWT token from auth store
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['x-request-id'] = this.generateRequestId();

        // Add organization header (stub for now)
        const orgId = this.getOrganizationId();
        if (orgId) {
          config.headers['x-organization-id'] = orgId;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
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
    // Use token getter if available, otherwise fallback to localStorage
    if (this.tokenGetter) {
      return this.tokenGetter();
    }
    return localStorage.getItem('auth_token');
  }

  private getOrganizationId(): string | null {
    // This will be connected to the organization context later
    return localStorage.getItem('organization_id');
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post('/api/auth/refresh', {
      refreshToken,
    });

    const { accessToken } = response.data;
    localStorage.setItem('auth_token', accessToken);
  }

  private handleAuthFailure(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    // Redirect to login page
    window.location.href = '/login';
  }

  private handlePermissionDenied(): void {
    // Show permission denied message or redirect
    console.warn('Insufficient permissions');
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
