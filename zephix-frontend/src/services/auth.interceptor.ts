import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

class AuthInterceptor {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: any[] = [];

  constructor() {
    // Use Vite proxy in dev (/api -> localhost:3000), full URL in prod
    const baseURL = import.meta.env.PROD
      ? (import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "https://zephix-backend-production.up.railway.app/api")
      : "/api"; // Relative path uses Vite proxy in development
    
    this.api = axios.create({
      baseURL: baseURL,
      timeout: 10000,
      withCredentials: true, // Enable cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - cookies only, no token attachment
    this.api.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        // No Authorization header - cookies are sent automatically with withCredentials: true
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        if (error.response?.status === 401) {
          // 401 means not authenticated - redirect to login
          // Cookies handle refresh on backend, so no client-side refresh needed
          this.redirectToLogin();
          return Promise.reject(error);
        }

        return Promise.reject(error);
      }
    );
  }

  private redirectToLogin() {
    // Cleanup legacy tokens but keep non-auth localStorage items
    const { cleanupLegacyAuthStorage } = require('@/auth/cleanupAuthStorage');
    cleanupLegacyAuthStorage();
    window.location.href = '/login';
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  public getApi(): AxiosInstance {
    return this.api;
  }
}

// Export singleton instance
const authInterceptor = new AuthInterceptor();
export const apiClient = authInterceptor.getApi();
export default apiClient;
