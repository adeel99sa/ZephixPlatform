import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  ttl: number; // Time to live in seconds
  limit: number; // Number of requests allowed
  blockDuration?: number; // Additional block time after limit exceeded
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Rate Limit Decorator for Authentication Endpoints
 *
 * Implements OWASP ASVS Level 1 rate limiting requirements:
 * - Configurable TTL and limit
 * - Optional block duration for enhanced security
 * - Request type filtering options
 *
 * @param options Rate limiting configuration
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Predefined rate limit configurations for common scenarios
 */
export const AuthRateLimits = {
  // Standard auth endpoints (login, register) - OWASP ASVS Level 1
  AUTH_STRICT: {
    ttl: 60, // 1 minute
    limit: 5, // 5 attempts per minute
    blockDuration: 300, // 5 minute additional block
  },

  // Password reset endpoints - More restrictive
  PASSWORD_RESET: {
    ttl: 60, // 1 minute
    limit: 3, // 3 attempts per minute
    blockDuration: 600, // 10 minute additional block
  },

  // Email verification - Moderate restrictions
  EMAIL_VERIFICATION: {
    ttl: 60, // 1 minute
    limit: 10, // 10 attempts per minute
    blockDuration: 60, // 1 minute additional block
  },

  // Profile endpoints - Less restrictive for authenticated users
  PROFILE_ACCESS: {
    ttl: 60, // 1 minute
    limit: 30, // 30 attempts per minute
    skipSuccessfulRequests: true,
  },

  // General API endpoints
  API_GENERAL: {
    ttl: 60, // 1 minute
    limit: 100, // 100 requests per minute
    skipSuccessfulRequests: true,
  },
} as const;
