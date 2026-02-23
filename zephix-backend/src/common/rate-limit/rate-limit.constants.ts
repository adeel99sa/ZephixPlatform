export enum RateLimitPolicy {
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_REGISTER = 'AUTH_REGISTER',
  AUTH_RESEND = 'AUTH_RESEND',
  AUTH_VERIFY = 'AUTH_VERIFY',
  AUTH_REFRESH = 'AUTH_REFRESH',
  AUTH_CSRF = 'AUTH_CSRF',
  AUTH_INVITE_CREATE = 'AUTH_INVITE_CREATE',
  AUTH_INVITE_ACCEPT = 'AUTH_INVITE_ACCEPT',
  AUTH_ORG_SIGNUP = 'AUTH_ORG_SIGNUP',
  AUTH_SLUG_CHECK = 'AUTH_SLUG_CHECK',
  STAGING_ADMIN_MARK_VERIFIED = 'STAGING_ADMIN_MARK_VERIFIED',
  PUBLIC_WRITE = 'PUBLIC_WRITE',
  PUBLIC_READ = 'PUBLIC_READ',
  AUTHENTICATED = 'AUTHENTICATED',
  COMPUTE = 'COMPUTE',
  WEBHOOK = 'WEBHOOK',
}

export const RATE_LIMIT_POLICY_KEY = 'rateLimitPolicy';
export const RATE_LIMIT_OVERRIDES_KEY = 'rateLimitOverrides';

export type RateLimitKeyStrategy =
  | 'ip'
  | 'email'
  | 'ip_email'
  | 'user'
  | 'org'
  | 'token';

export interface RateLimitPolicyConfig {
  windowMs: number;
  max: number;
  message: string;
  keyStrategies: RateLimitKeyStrategy[];
}

export const POLICY_CONFIGS: Record<RateLimitPolicy, RateLimitPolicyConfig> = {
  [RateLimitPolicy.AUTH_LOGIN]: {
    windowMs: 900_000,
    max: 5,
    message: 'Too many login attempts, please try again later',
    keyStrategies: ['ip', 'email', 'ip_email'],
  },
  [RateLimitPolicy.AUTH_REGISTER]: {
    windowMs: 900_000,
    max: 3,
    message: 'Too many registration attempts, please try again later',
    keyStrategies: ['ip', 'email'],
  },
  [RateLimitPolicy.AUTH_RESEND]: {
    windowMs: 3_600_000,
    max: 5,
    message: 'Too many resend requests. Please try again later',
    keyStrategies: ['ip', 'email'],
  },
  [RateLimitPolicy.AUTH_VERIFY]: {
    windowMs: 900_000,
    max: 10,
    message: 'Too many verification attempts',
    keyStrategies: ['ip', 'token'],
  },
  [RateLimitPolicy.AUTH_REFRESH]: {
    windowMs: 60_000,
    max: 10,
    message: 'Too many token refresh attempts',
    keyStrategies: ['ip', 'user'],
  },
  [RateLimitPolicy.AUTH_CSRF]: {
    windowMs: 60_000,
    max: 30,
    message: 'Too many CSRF token requests',
    keyStrategies: ['ip'],
  },
  [RateLimitPolicy.AUTH_INVITE_CREATE]: {
    windowMs: 3_600_000,
    max: 10,
    message: 'Too many invitation requests',
    keyStrategies: ['ip', 'user', 'org'],
  },
  [RateLimitPolicy.AUTH_INVITE_ACCEPT]: {
    windowMs: 3_600_000,
    max: 5,
    message: 'Too many invitation acceptance attempts',
    keyStrategies: ['ip', 'token'],
  },
  [RateLimitPolicy.AUTH_ORG_SIGNUP]: {
    windowMs: 900_000,
    max: 3,
    message: 'Too many signup attempts, please try again later',
    keyStrategies: ['ip', 'email'],
  },
  [RateLimitPolicy.AUTH_SLUG_CHECK]: {
    windowMs: 60_000,
    max: 20,
    message: 'Too many slug check requests',
    keyStrategies: ['ip'],
  },
  [RateLimitPolicy.STAGING_ADMIN_MARK_VERIFIED]: {
    windowMs: 900_000,
    max: 20,
    message: 'Too many staging admin verification operations',
    keyStrategies: ['ip', 'user', 'org'],
  },
  [RateLimitPolicy.PUBLIC_WRITE]: {
    windowMs: 60_000,
    max: 10,
    message: 'Too many requests, please try again later',
    keyStrategies: ['ip'],
  },
  [RateLimitPolicy.PUBLIC_READ]: {
    windowMs: 60_000,
    max: 30,
    message: 'Too many requests, please try again later',
    keyStrategies: ['ip'],
  },
  [RateLimitPolicy.AUTHENTICATED]: {
    windowMs: 60_000,
    max: 60,
    message: 'Too many requests from this account',
    keyStrategies: ['ip', 'user'],
  },
  [RateLimitPolicy.COMPUTE]: {
    windowMs: 60_000,
    max: 20,
    message: 'Too many compute requests',
    keyStrategies: ['ip', 'user', 'org'],
  },
  [RateLimitPolicy.WEBHOOK]: {
    windowMs: 60_000,
    max: 100,
    message: 'Webhook rate limit exceeded',
    keyStrategies: ['ip'],
  },
};

/**
 * Policies that MUST fail closed (503) when Redis is unavailable.
 * In-memory fallback is not acceptable for these because an attacker
 * can rotate replicas or trigger deploys to reset counters.
 */
export const FAIL_CLOSED_POLICIES: ReadonlySet<RateLimitPolicy> = new Set([
  RateLimitPolicy.AUTH_LOGIN,
  RateLimitPolicy.AUTH_REGISTER,
  RateLimitPolicy.AUTH_RESEND,
  RateLimitPolicy.AUTH_ORG_SIGNUP,
  RateLimitPolicy.AUTH_SLUG_CHECK,
  RateLimitPolicy.AUTH_INVITE_ACCEPT,
  RateLimitPolicy.AUTH_VERIFY,
  RateLimitPolicy.STAGING_ADMIN_MARK_VERIFIED,
]);

export interface BackoffTier {
  failures: number;
  maxOverride: number;
  windowMsOverride: number;
}

export const AUTH_BACKOFF_CONFIG = {
  windowSec: 3600,
  tiers: [
    { failures: 5, maxOverride: 3, windowMsOverride: 1_800_000 },
    { failures: 10, maxOverride: 1, windowMsOverride: 3_600_000 },
    { failures: 20, maxOverride: 0, windowMsOverride: 3_600_000 },
  ] as BackoffTier[],
};
