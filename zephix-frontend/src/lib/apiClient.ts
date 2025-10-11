import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '@/types/api';

/**
 * Extended Axios error with our API error format
 */
interface ApiAxiosError extends AxiosError {
  response?: {
    data: ApiError;
    status: number;
    statusText: string;
  };
}

/**
 * Create configured axios instance with interceptors
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: Add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Get token from localStorage (or your auth solution)
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('auth_token') 
        : null;

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // Response interceptor: Handle errors consistently
  client.interceptors.response.use(
    (response) => {
      // Success response - return data directly
      return response.data;
    },
    (error: ApiAxiosError) => {
      // Network error (no response)
      if (!error.response) {
        const networkError: ApiError = {
          statusCode: 500,
          error: 'Network Error',
          message: 'Unable to connect to the server. Please check your internet connection.',
        };
        return Promise.reject(networkError);
      }

      // Server responded with error
      const apiError: ApiError = {
        statusCode: error.response.status as ApiError['statusCode'],
        error: error.response.data?.error || error.response.statusText,
        message: error.response.data?.message || 'An unexpected error occurred',
        constraint: error.response.data?.constraint,
        path: error.response.data?.path,
        timestamp: error.response.data?.timestamp,
      };

      return Promise.reject(apiError);
    },
  );

  return client;
}

/**
 * Singleton API client instance
 */
export const apiClient = createApiClient();

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    'message' in error
  );
}
