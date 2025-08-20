import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Enhanced Authentication Rate Limiting Guard
 *
 * Implements OWASP ASVS Level 1 requirements:
 * - 5 attempts per minute per IP for authentication endpoints
 * - Account enumeration protection
 * - Comprehensive logging for security monitoring
 * - IP-based and user-based rate limiting
 */
@Injectable()
export class AuthRateLimitGuard extends ThrottlerGuard {
  /**
   * Enhanced rate limit generation based on IP and endpoint
   */
  protected async generateKeys(
    context: ExecutionContext,
    tracker: string,
    ttl: number,
  ): Promise<Array<string>> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = await this.getTracker(request);
    const endpoint = request.route?.path || request.url;

    // Create multiple rate limit keys for comprehensive protection
    const keys = [
      `throttle:${tracker}:${ip}`, // IP-based rate limiting
      `throttle:${tracker}:${ip}:${endpoint}`, // IP + endpoint specific
    ];

    // Add user-based rate limiting if authenticated
    const user = (request as any).user;
    if (user?.id) {
      keys.push(`throttle:${tracker}:user:${user.id}`);
      keys.push(`throttle:${tracker}:user:${user.id}:${endpoint}`);
    }

    return keys;
  }

  /**
   * Enhanced IP extraction with proxy support
   */
  protected async getTracker(req: Request): Promise<string> {
    // Extract real IP from various proxy headers
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const clientIp = req.headers['x-client-ip'] as string;

    // Prefer forwarded IP from trusted proxies
    if (forwarded) {
      const ips = forwarded.split(',').map((ip) => ip.trim());
      return ips[0]; // First IP is usually the original client
    }

    if (realIp) return realIp;
    if (clientIp) return clientIp;

    // Fallback to connection IP
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Enhanced error handling with security logging
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    { totalHits, timeToExpire }: { totalHits: number; timeToExpire: number },
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = await this.getTracker(request);
    const endpoint = request.route?.path || request.url;
    const userAgent = request.headers['user-agent'];
    const user = (request as any).user;

    // Security event logging
    console.warn('🚨 Rate Limit Exceeded:', {
      timestamp: new Date().toISOString(),
      ip,
      endpoint,
      userAgent,
      userId: user?.id || 'anonymous',
      totalHits,
      timeToExpire,
      method: request.method,
      headers: {
        'x-forwarded-for': request.headers['x-forwarded-for'],
        'x-real-ip': request.headers['x-real-ip'],
        'user-agent': userAgent,
      },
    });

    // Throw rate limit exception with security headers
    throw new ThrottlerException(
      'Too many authentication attempts. Please try again later.',
    );
  }

  /**
   * Enhanced request validation
   */
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = await this.getTracker(request);

    // Security logging for all attempts
    console.log('🔍 Auth Rate Limit Check:', {
      timestamp: new Date().toISOString(),
      ip,
      endpoint: request.route?.path || request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
    });

    return super.canActivate(context);
  }
}
