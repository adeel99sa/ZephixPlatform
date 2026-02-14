/**
 * Phase 3D: Centralized Rate Limit Configuration
 *
 * Default limits per endpoint category.
 * Multiplied by plan's api_rate_multiplier from entitlements.
 *
 * Free  = 1x multiplier → 30 req/min for standard
 * Team  = 2x multiplier → 60 req/min for standard
 * Enterprise = 10x → 300 req/min for standard
 */

export interface RateLimitTier {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window (before plan multiplier) */
  baseMax: number;
  /** Human-readable description */
  description: string;
}

/**
 * Rate limit tiers by endpoint category.
 * baseMax is multiplied by the org's api_rate_multiplier.
 */
export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  /** Default for most API endpoints */
  standard: {
    windowMs: 60_000,
    baseMax: 30,
    description: 'Standard API endpoints',
  },

  /** CPU-intensive endpoints: scenario compute, capacity leveling, portfolio analytics */
  compute: {
    windowMs: 60_000,
    baseMax: 5,
    description: 'Compute-intensive endpoints',
  },

  /** File operations: presign, upload complete */
  storage: {
    windowMs: 60_000,
    baseMax: 20,
    description: 'Storage operations',
  },

  /** Auth endpoints: login, register, refresh */
  auth: {
    windowMs: 900_000,
    baseMax: 5,
    description: 'Authentication endpoints',
  },

  /** Admin operations: purge, export */
  admin: {
    windowMs: 60_000,
    baseMax: 10,
    description: 'Admin operations',
  },
};

/**
 * Maps endpoint handlers to rate limit tiers.
 * Used by the @RateLimit decorator.
 */
export type RateLimitTierName = keyof typeof RATE_LIMIT_TIERS;
