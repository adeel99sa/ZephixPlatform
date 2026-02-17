import { RATE_LIMIT } from '../constants/queue.constants';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Wave 10: In-memory per-workspace token bucket rate limiter.
 * Prevents one workspace from starving others in the worker.
 */
export class WorkspaceRateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly tokensPerSecond: number;
  private readonly burst: number;

  constructor(
    tokensPerSecond: number = RATE_LIMIT.TOKENS_PER_SECOND,
    burst: number = RATE_LIMIT.BURST,
  ) {
    this.tokensPerSecond = tokensPerSecond;
    this.burst = burst;
  }

  /**
   * Try to consume a token for the given workspace.
   * Returns true if allowed, false if rate-limited.
   */
  tryConsume(workspaceId: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(workspaceId);

    if (!bucket) {
      bucket = { tokens: this.burst, lastRefill: now };
      this.buckets.set(workspaceId, bucket);
    }

    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.burst, bucket.tokens + elapsed * this.tokensPerSecond);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /** Clean up stale buckets to prevent memory leaks. */
  pruneStale(maxAgeMs = 300_000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, bucket] of this.buckets) {
      if (bucket.lastRefill < cutoff) {
        this.buckets.delete(key);
      }
    }
  }
}
