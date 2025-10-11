/**
 * Standardized API error response from backend
 */
export interface ApiError {
  statusCode: 400 | 409 | 422 | 500;
  error: string;
  message: string;
  constraint?: string;
  path?: string;
  timestamp?: string;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
}

/**
 * Field-level error for forms
 */
export interface FieldError {
  field: string;
  message: string;
}
