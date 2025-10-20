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

// Create axios instance with enterprise configuration
const API_BASE = import.meta.env.PROD
  ? (import.meta.env.VITE_API_BASE ?? 'https://zephix-backend-production.up.railway.app/api')
  : '/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
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
