import { Request, Response } from 'express';
import { UserEntity } from '../../domain/entities/user.entity';

// Environment variable types
export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SSL: string;
  DB_SYNCHRONIZE: string;
  DB_MAX_CONNECTIONS: string;
  DB_IDLE_TIMEOUT: string;
  DB_CONNECTION_TIMEOUT: string;
  DB_LOGGING: string;
  DB_DEBUG: string;
  LOG_LEVEL: string;
  ALLOWED_ORIGINS: string;
  npm_package_version: string;
}

// API Request/Response types
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
  correlationId?: string;
}

export interface AuthenticatedResponse extends Response {
  locals: {
    correlationId: string;
    requestId: string;
  };
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  correlationId: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

// Auth types
export interface AuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: UserEntity;
  error?: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: UserEntity;
  requiresMFA?: boolean;
  error?: string;
}

// Health check types
export interface HealthCheck {
  status: string;
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  environment: string;
  version: string;
  checks: {
    database: string;
    redis: string;
  };
  responseTime?: number;
}

export interface ReadinessCheck {
  status: string;
  timestamp: string;
  checks: {
    database: string;
    redis: string;
  };
}

export interface MetricsInfo {
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  environment: string;
  version: string;
  nodeVersion: string;
  platform: string;
  arch: string;
}

// Database types
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

// JWT types
export interface JWTConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

// Monitoring types
export interface MetricsConfig {
  enabled: boolean;
  prefix: string;
  customLabels: string[];
}

// Logging types
export interface LogConfig {
  level: string;
  isProduction: boolean;
}

// Type guards
export function isApiError(error: any): error is ApiError {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
}

export function isValidationError(error: any): error is ValidationError {
  return error && typeof error.field === 'string' && typeof error.message === 'string';
}

// Environment helper
export function getEnvVar(key: keyof EnvironmentConfig): string {
  return process.env[key] || '';
}

// Type-safe environment access
export const env = {
  get NODE_ENV() { return getEnvVar('NODE_ENV'); },
  get PORT() { return getEnvVar('PORT'); },
  get JWT_SECRET() { return getEnvVar('JWT_SECRET'); },
  get JWT_REFRESH_SECRET() { return getEnvVar('JWT_REFRESH_SECRET'); },
  get JWT_EXPIRES_IN() { return getEnvVar('JWT_EXPIRES_IN'); },
  get JWT_REFRESH_EXPIRES_IN() { return getEnvVar('JWT_REFRESH_EXPIRES_IN'); },
  get DB_HOST() { return getEnvVar('DB_HOST'); },
  get DB_PORT() { return getEnvVar('DB_PORT'); },
  get DB_USERNAME() { return getEnvVar('DB_USERNAME'); },
  get DB_PASSWORD() { return getEnvVar('DB_PASSWORD'); },
  get DB_DATABASE() { return getEnvVar('DB_DATABASE'); },
  get DB_SSL() { return getEnvVar('DB_SSL'); },
  get DB_SYNCHRONIZE() { return getEnvVar('DB_SYNCHRONIZE'); },
  get DB_MAX_CONNECTIONS() { return getEnvVar('DB_MAX_CONNECTIONS'); },
  get DB_IDLE_TIMEOUT() { return getEnvVar('DB_IDLE_TIMEOUT'); },
  get DB_CONNECTION_TIMEOUT() { return getEnvVar('DB_CONNECTION_TIMEOUT'); },
  get DB_LOGGING() { return getEnvVar('DB_LOGGING'); },
  get DB_DEBUG() { return getEnvVar('DB_DEBUG'); },
  get LOG_LEVEL() { return getEnvVar('LOG_LEVEL'); },
  get ALLOWED_ORIGINS() { return getEnvVar('ALLOWED_ORIGINS'); },
  get npm_package_version() { return getEnvVar('npm_package_version'); },
}; 