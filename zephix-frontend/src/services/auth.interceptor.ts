import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

class AuthInterceptor {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: any[] = [];

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');
        
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
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

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.api(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          return new Promise((resolve, reject) => {
            // Try to refresh token or redirect to login
            const refreshToken = localStorage.getItem('refreshToken');
            
            if (!refreshToken) {
              this.redirectToLogin();
              reject(error);
              return;
            }

            // If you have refresh token endpoint, implement here
            // For now, just redirect to login
            this.redirectToLogin();
            reject(error);
          });
        }

        return Promise.reject(error);
      }
    );
  }

  private redirectToLogin() {
    localStorage.clear();
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