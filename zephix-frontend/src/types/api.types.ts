export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface ValidationError extends ApiError {
  errors: Record<string, string[]>;
}

