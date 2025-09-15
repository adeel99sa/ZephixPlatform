import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

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

// Create axios instance with enterprise configuration
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000, // 30 seconds
  withCredentials: true, // Enable cookies for refresh tokens
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for token attachment and logging
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from Zustand auth store
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
            config.headers.Authorization = `Bearer ${state.accessToken}`;
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
    
    // Development logging
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
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
    // Development logging
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
      console.log('Response data:', response.data);
    }
    
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Development error logging
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`);
      console.error('Error details:', error.response?.data || error.message);
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh the token
        const refreshResponse = await api.post('/auth/refresh');
        
        if (refreshResponse.data.accessToken) {
          // Update the stored token
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            parsed.state.accessToken = refreshResponse.data.accessToken;
            parsed.state.expiresAt = Date.now() + (refreshResponse.data.expiresIn * 1000);
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
          }
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('auth-storage');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
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

// Type-safe API methods
export const apiClient = {
  get: <T = any>(url: string, config?: any) => 
    api.get<T>(url, config).then(res => res.data),
  
  post: <T = any>(url: string, data?: any, config?: any) => 
    api.post<T>(url, data, config).then(res => res.data),
  
  put: <T = any>(url: string, data?: any, config?: any) => 
    api.put<T>(url, data, config).then(res => res.data),
  
  patch: <T = any>(url: string, data?: any, config?: any) => 
    api.patch<T>(url, data, config).then(res => res.data),
  
  delete: <T = any>(url: string, config?: any) => 
    api.delete<T>(url, config).then(res => res.data),
};

// Default export for backward compatibility
export default api;

// Named export for explicit usage
export { api };

// Backward compatibility export for legacy code
export const apiJson = async (url: string, options: any = {}) => {
  const config = {
    url,
    method: options.method || 'GET',
    data: options.body,
    headers: options.headers || {},
    ...options
  };
  
  const response = await api(config);
  return response.data;
};
