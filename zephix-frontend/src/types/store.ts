// store.ts - Store-related types for Zephix Platform

// Base error types
export interface BaseError {
  message: string;
  code?: string;
  timestamp: string;
}

export interface NetworkError extends BaseError {
  type: 'network';
  status?: number;
  url?: string;
}

export interface ValidationError extends BaseError {
  type: 'validation';
  field?: string;
  details?: Record<string, string>;
}

export interface AuthError extends BaseError {
  type: 'auth';
  reason: 'invalid_credentials' | 'token_expired' | 'unauthorized' | 'rate_limited';
}

export interface ApiError extends BaseError {
  type: 'api';
  endpoint: string;
  method: string;
}

export interface OrganizationError extends BaseError {
  type: 'organization';
  reason?: string;
  endpoint?: string;
  method?: string;
}

// Union type for all error types
export type StoreError = NetworkError | ValidationError | AuthError | ApiError | OrganizationError;

// Loading states
export interface LoadingState {
  isLoading: boolean;
  loadingAction?: string;
  loadingStartTime?: number;
}

// Error states
export interface ErrorState {
  error: StoreError | null;
  errorTimestamp?: string;
}

// Success states
export interface SuccessState {
  lastSuccess?: string;
  successTimestamp?: string;
}

// Async action result types
export interface AsyncResult<T = void> {
  success: boolean;
  data?: T;
  error?: StoreError;
}

// Store state base interface
export interface BaseStoreState extends LoadingState, ErrorState, SuccessState {}

// Helper function to create errors
export const createError = (
  type: StoreError['type'],
  message: string,
  additionalData?: Partial<StoreError>
): StoreError => {
  const baseError: BaseError = {
    message,
    timestamp: new Date().toISOString(),
  };

  switch (type) {
    case 'network':
      return {
        ...baseError,
        type: 'network',
        ...additionalData,
      } as NetworkError;
    
    case 'validation':
      return {
        ...baseError,
        type: 'validation',
        ...additionalData,
      } as ValidationError;
    
    case 'auth':
      return {
        ...baseError,
        type: 'auth',
        reason: (additionalData as AuthError)?.reason || 'unauthorized',
        ...additionalData,
      } as AuthError;
    
    case 'api':
      return {
        ...baseError,
        type: 'api',
        endpoint: (additionalData as ApiError)?.endpoint || 'unknown',
        method: (additionalData as ApiError)?.method || 'GET',
        ...additionalData,
      } as ApiError;
    
    case 'organization':
      return {
        ...baseError,
        type: 'organization',
        reason: (additionalData as OrganizationError)?.reason,
        endpoint: (additionalData as OrganizationError)?.endpoint,
        method: (additionalData as OrganizationError)?.method,
        ...additionalData,
      } as OrganizationError;
    
    default:
      return {
        ...baseError,
        type: 'api',
        endpoint: 'unknown',
        method: 'GET',
        ...additionalData,
      } as ApiError;
  }
};
