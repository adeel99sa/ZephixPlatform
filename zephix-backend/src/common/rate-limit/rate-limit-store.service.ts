import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

const INCR_EXPIRE_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return {count, redis.call('TTL', KEYS[1])}
`;

export interface IncrementResult {
  count: number;
  ttlSec: number;
}

@Injectable()
export class RateLimitStoreService implements OnModuleInit, OnModuleDestroy {
  private redis: IORedis | null = null;
  private readonly memoryStore = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly logger = new Logger(RateLimitStoreService.name);
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly configService: ConfigService) {}

  get isRedisAvailable(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('redis.url');
    if (!redisUrl || redisUrl === 'redis://localhost:6379') {
      const env = this.configService.get<string>('environment') || 'development';
      if (env === 'production' || env === 'staging') {
        this.logger.error(
          'REDIS_URL not configured — auth endpoints will return 503 until Redis is available',
        );
      }
      this.logger.warn(
        `Rate limit store: redisAvailable=false keyPrefix=rl: fallback=memory`,
      );
      this.startMemoryCleanup();
      return;
    }

    try {
      this.redis = new IORedis(redisUrl, {
        db: this.configService.get<number>('redis.db') || 0,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 5000,
        retryStrategy: (times: number) => {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
      });
      await this.redis.connect();
      this.logger.log(
        `Rate limit store: redisAvailable=true keyPrefix=rl:`,
      );
    } catch (err) {
      this.logger.error(
        `Redis connection failed for rate limiting: ${(err as Error)?.message}`,
      );
      this.redis = null;
      this.logger.warn(
        `Rate limit store: redisAvailable=false keyPrefix=rl: fallback=memory`,
      );
      this.startMemoryCleanup();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.redis) {
      await this.redis.quit().catch(() => {});
    }
  }

  /**
   * Increment a rate limit counter.
   * @param failClosed If true and Redis is unavailable, returns null instead of falling back.
   */
  async increment(
    key: string,
    windowSec: number,
    failClosed = false,
  ): Promise<IncrementResult | null> {
    if (this.redis) {
      try {
        return await this.redisIncrement(key, windowSec);
      } catch (err) {
        this.logger.warn(
          `Redis increment failed: ${(err as Error)?.message}`,
        );
        if (failClosed) return null;
      }
    } else if (failClosed) {
      return null;
    }
    return this.memoryIncrement(key, windowSec);
  }

  /**
   * Get the current count for a key.
   * @param failClosed If true and Redis is unavailable, returns null.
   */
  async getCount(key: string, failClosed = false): Promise<number | null> {
    if (this.redis) {
      try {
        const val = await this.redis.get(key);
        return val ? parseInt(val, 10) : 0;
      } catch {
        if (failClosed) return null;
      }
    } else if (failClosed) {
      return null;
    }
    const record = this.memoryStore.get(key);
    if (!record || Date.now() > record.resetTime) return 0;
    return record.count;
  }

  async recordAuthFailure(emailHash: string): Promise<number> {
    const key = `rl:backoff:${emailHash}`;
    const result = await this.increment(key, 3600, false);
    return result?.count ?? 0;
  }

  async clearAuthFailures(emailHash: string): Promise<void> {
    const key = `rl:backoff:${emailHash}`;
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        /* best effort */
      }
    }
    this.memoryStore.delete(key);
  }

  private async redisIncrement(
    key: string,
    windowSec: number,
  ): Promise<IncrementResult> {
    const result = (await this.redis!.eval(
      INCR_EXPIRE_LUA,
      1,
      key,
      windowSec,
    )) as [number, number];
    return { count: result[0], ttlSec: result[1] };
  }

  private memoryIncrement(
    key: string,
    windowSec: number,
  ): IncrementResult {
    const now = Date.now();
    let record = this.memoryStore.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowSec * 1000 };
    }
    record.count++;
    this.memoryStore.set(key, record);
    const ttlSec = Math.max(0, Math.ceil((record.resetTime - now) / 1000));
    return { count: record.count, ttlSec };
  }

  private startMemoryCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.memoryStore.entries()) {
        if (now > record.resetTime) {
          this.memoryStore.delete(key);
        }
      }
    }, 60_000);
  }
}
