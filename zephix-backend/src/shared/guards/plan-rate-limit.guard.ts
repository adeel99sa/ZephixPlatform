/**
 * Phase 3D: Plan-Aware Rate Limiter Guard
 *
 * Uses centralized tier config × plan's api_rate_multiplier.
 * In-memory store per key. Does NOT replace existing RateLimiterGuard;
 * use @PlanRateLimit('compute') decorator on endpoints that need
 * plan-scaled limits.
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RATE_LIMIT_TIERS, RateLimitTierName } from './rate-limit.config';
import { ErrorCode } from '../errors/error-codes';

export const PLAN_RATE_LIMIT_KEY = 'plan_rate_limit_tier';

/**
 * Decorator: Apply plan-aware rate limiting to an endpoint.
 * @param tier — one of 'standard' | 'compute' | 'storage' | 'auth' | 'admin'
 */
export const PlanRateLimit = (tier: RateLimitTierName) =>
  SetMetadata(PLAN_RATE_LIMIT_KEY, tier);

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class PlanRateLimitGuard implements CanActivate {
  private readonly store = new Map<string, RateLimitRecord>();

  constructor(private readonly reflector: Reflector) {
    // Cleanup every 5 minutes
    setInterval(() => this.cleanup(), 300_000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tierName = this.reflector.get<RateLimitTierName>(
      PLAN_RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!tierName) return true; // No decorator → skip

    const tier = RATE_LIMIT_TIERS[tierName];
    if (!tier) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Skip health/metrics
    if (request.path?.startsWith('/api/health') || request.path?.startsWith('/api/metrics')) {
      return true;
    }

    // Resolve plan multiplier from user context (default 1)
    const user = (request as any).user;
    const multiplier = user?.rateLimitMultiplier || 1;
    const maxRequests = Math.ceil(tier.baseMax * multiplier);

    // Build key: IP + userId + endpoint
    const ip = this.getClientIp(request);
    const userId = user?.id || 'anon';
    const endpoint = request.route?.path || request.path;
    const key = `prl:${ip}:${userId}:${endpoint}`;

    const now = Date.now();
    let record = this.store.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + tier.windowMs };
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      response.setHeader('X-RateLimit-Limit', maxRequests);
      response.setHeader('X-RateLimit-Remaining', 0);
      response.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
      response.setHeader('Retry-After', retryAfter);

      throw new HttpException(
        {
          code: ErrorCode.RATE_LIMITED,
          message: `Rate limit exceeded. Try again in ${retryAfter}s`,
          retryAfter,
          limit: maxRequests,
          windowMs: tier.windowMs,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    this.store.set(key, record);

    response.setHeader('X-RateLimit-Limit', maxRequests);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    response.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    return true;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) return forwarded.split(',')[0].trim();
    const realIp = req.headers['x-real-ip'] as string;
    if (realIp) return realIp;
    return req.socket?.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) this.store.delete(key);
    }
  }
}
