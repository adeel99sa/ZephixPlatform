export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface StandardError {
  code: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'NOT_FOUND' | 'SERVER_ERROR' | 'NETWORK_ERROR';
  message: string;
  status: number;
  details?: {
    field?: string;
    value?: unknown;
    constraint?: string;
  };
  timestamp: string;
  requestId?: string;
}

export interface ApiClientConfig {
  baseURL?: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}
