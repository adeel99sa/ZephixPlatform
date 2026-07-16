import { Injectable } from '@nestjs/common';

/**
 * Read-only view of a fixed-window counter, used to enforce a limit BEFORE
 * doing expensive work (SEC-3: check the login-fail counter before bcrypt so a
 * throttled account cannot be probed even with a correct password).
 */
export interface RateLimitStatus {
  /** Current hit count in the window (0 if absent, or if the store is degraded). */
  count: number;
  /** Seconds until the window resets (0 if unknown / absent / degraded). */
  ttlSeconds: number;
}

export interface AuthRateLimitStore {
  /**
   * Increment the counter for `key` in a fixed window and report whether the
   * request is still within `limit`. Call this on the event being counted
   * (e.g. a failed login). Implementations MUST fail OPEN (return allowed) if
   * their backend is unavailable — a rate limiter must never take down auth.
   */
  hit(
    key: string,
    windowSeconds: number,
    limit: number,
  ): Promise<{ allowed: boolean; remaining: number }>;

  /**
   * Read the current counter WITHOUT incrementing it. Used to enforce a limit
   * at the start of a request. MUST fail OPEN (return count 0) when degraded.
   */
  peek(key: string): Promise<RateLimitStatus>;
}

@Injectable()
export class NoopAuthRateLimitStore implements AuthRateLimitStore {
  async hit(): Promise<{ allowed: boolean; remaining: number }> {
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER };
  }

  async peek(): Promise<RateLimitStatus> {
    return { count: 0, ttlSeconds: 0 };
  }
}
