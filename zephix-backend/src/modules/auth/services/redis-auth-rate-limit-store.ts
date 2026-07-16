import { Logger, OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';
import { AuthRateLimitStore, RateLimitStatus } from './auth-rate-limit-store';

/** Zero-UUID SYSTEM subject for security events with no user/org (SEC-3). */
const SYSTEM_UUID = '00000000-0000-0000-0000-000000000000';

/** Throttle the degradation ERROR log so a Redis outage under load can't flood it. */
const DEGRADED_LOG_INTERVAL_MS = 60_000;

/**
 * Minimal audit port so this low-level store doesn't couple to the full
 * AuditService type (and so tests can pass a trivial mock). The real
 * AuditService.record() is structurally compatible.
 */
export interface AuthRateLimitAuditPort {
  record(input: {
    organizationId: string;
    actorUserId: string;
    entityType: AuditEntityType;
    entityId: string;
    action: AuditAction;
    metadata?: Record<string, unknown> | null;
  }): Promise<unknown>;
}

/**
 * Redis-backed fixed-window rate limiter for the auth path (SEC-3).
 *
 * Ruling A — FAIL-OPEN-LOUD. If Redis is unreachable, hit()/peek() return
 * "allowed / count 0" so login and password-reset keep working (a rate limiter
 * that takes down auth is strictly worse than the Noop it replaced), AND the
 * degradation is announced once: an ERROR log (self-throttled to ~1/min) plus
 * an audit receipt on the degradation transition and again on recovery. That
 * makes "was the limiter active during <incident>?" answerable from the audit
 * trail, not just logs.
 *
 * Connection posture INVERTS the KPI queue factory: same lazy lifecycle, but
 * fail-FAST retries (commandTimeout, maxRetriesPerRequest:1, no offline queue)
 * so a Redis outage makes commands REJECT quickly instead of hanging — a hit()
 * that can hang is fail-closed wearing fail-open's config.
 */
export class RedisAuthRateLimitStore
  implements AuthRateLimitStore, OnModuleDestroy
{
  private readonly logger = new Logger('AuthRateLimitStore');
  private readonly redis: IORedis;
  private degraded = false;
  private lastDegradedLogMs = 0;

  constructor(
    redisUrl: string,
    private readonly audit?: AuthRateLimitAuditPort,
  ) {
    this.redis = new IORedis(redisUrl, {
      // Fail-FAST posture (inverted from the KPI factory's retry-forever):
      commandTimeout: 150,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    // ioredis emits 'error' on every failed reconnect; without a handler these
    // become unhandled and can crash the process. Functional degradation is
    // handled in hit()/peek() catch blocks — this just absorbs the noise.
    this.redis.on('error', () => {
      /* swallowed; degradation is reported once via onRedisFailure() */
    });
  }

  async hit(
    key: string,
    windowSeconds: number,
    limit: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const count = await this.redis.incr(key);
      // Set the TTL only on the first hit of a new window (fixed window).
      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      await this.onRedisSuccess();
      return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
    } catch (err) {
      await this.onRedisFailure(err);
      return { allowed: true, remaining: Number.MAX_SAFE_INTEGER }; // fail-open
    }
  }

  async peek(key: string): Promise<RateLimitStatus> {
    try {
      const res = await this.redis.multi().get(key).ttl(key).exec();
      // res = [[err, value], [err, ttl]]
      const rawCount = (res?.[0]?.[1] as string | null) ?? '0';
      const count = Number.parseInt(rawCount, 10) || 0;
      const ttlRaw = (res?.[1]?.[1] as number | null) ?? 0;
      await this.onRedisSuccess();
      return { count, ttlSeconds: ttlRaw > 0 ? ttlRaw : 0 };
    } catch (err) {
      await this.onRedisFailure(err);
      return { count: 0, ttlSeconds: 0 }; // fail-open: no throttle when degraded
    }
  }

  /** A successful Redis op after a degradation window = recovery. */
  private async onRedisSuccess(): Promise<void> {
    if (this.degraded) {
      this.degraded = false;
      this.logger.log(
        'AUTH_RATE_LIMIT_RECOVERED redis reachable again — per-account rate limiting re-armed',
      );
      await this.writeReceipt(AuditAction.AUTH_RATE_LIMIT_RECOVERED, {});
    }
  }

  /** Redis op failed: fail open, but announce the degradation loudly & once. */
  private async onRedisFailure(err: unknown): Promise<void> {
    const now = Date.now();
    const firstFailure = !this.degraded;
    if (firstFailure) {
      this.degraded = true;
      await this.writeReceipt(AuditAction.AUTH_RATE_LIMIT_DEGRADED, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    if (firstFailure || now - this.lastDegradedLogMs > DEGRADED_LOG_INTERVAL_MS) {
      this.lastDegradedLogMs = now;
      this.logger.error(
        `AUTH_RATE_LIMIT_DEGRADED redis unavailable — FAILING OPEN, per-account rate limiting is DISABLED: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async writeReceipt(
    action: AuditAction,
    extra: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.audit?.record({
        organizationId: SYSTEM_UUID,
        actorUserId: SYSTEM_UUID,
        entityType: AuditEntityType.SECURITY,
        entityId: SYSTEM_UUID,
        action,
        metadata: { component: 'auth-rate-limit-store', ...extra },
      });
    } catch {
      /* audit is best-effort here; it must never break the auth path */
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => {});
  }
}
