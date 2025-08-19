import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string; // Custom error message
  statusCode?: number; // Custom status code
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly defaultOptions: RateLimitOptions;
  private readonly rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.defaultOptions = {
      windowMs: this.configService.get<number>('security.rateLimit.windowMs', 60000), // 1 minute
      max: this.configService.get<number>('security.rateLimit.max', 60), // 60 requests per minute
      message: 'Too many requests from this IP, please try again later',
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    };
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const options = this.getRateLimitOptions(context);
    
    // Skip rate limiting for health checks and metrics
    if (this.shouldSkipRateLimit(request)) {
      return true;
    }

    const key = this.generateRateLimitKey(request);
    const currentTime = Date.now();
    
    // Get or create rate limit record
    let record = this.rateLimitStore.get(key);
    if (!record || currentTime > record.resetTime) {
      record = { count: 0, resetTime: currentTime + options.windowMs };
    }

    // Check if limit exceeded
    if (record.count >= options.max) {
      const retryAfter = Math.ceil((record.resetTime - currentTime) / 1000);
      
      // Set rate limit headers
      const response = context.switchToHttp().getResponse();
      response.setHeader('X-RateLimit-Limit', options.max);
      response.setHeader('X-RateLimit-Remaining', 0);
      response.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
      response.setHeader('Retry-After', retryAfter);
      
      throw new HttpException(
        {
          message: options.message,
          retryAfter,
          limit: options.max,
          windowMs: options.windowMs,
        },
        options.statusCode || HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    record.count++;
    this.rateLimitStore.set(key, record);

    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', options.max);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - record.count));
    response.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    return true;
  }

  private getRateLimitOptions(context: ExecutionContext): RateLimitOptions {
    // Check for custom rate limit options in metadata
    const customOptions = this.reflector.get<RateLimitOptions>('rateLimit', context.getHandler());
    
    if (customOptions) {
      return { ...this.defaultOptions, ...customOptions };
    }

    // Check if this is an auth endpoint for stricter limits
    const isAuthEndpoint = context.getHandler().name.includes('auth') || 
                          context.getHandler().name.includes('login') ||
                          context.getHandler().name.includes('register');
    
    if (isAuthEndpoint) {
      return {
        ...this.defaultOptions,
        windowMs: this.configService.get<number>('security.rateLimit.authWindowMs', 900000), // 15 minutes
        max: this.configService.get<number>('security.rateLimit.authMax', 5), // 5 attempts per 15 minutes
        message: 'Too many authentication attempts, please try again later',
      };
    }

    return this.defaultOptions;
  }

  private generateRateLimitKey(request: Request): string {
    // Use IP address as primary key
    const ip = this.getClientIP(request);
    
    // Include user ID if authenticated for user-specific limits
    const userId = (request as any).user?.id;
    
    // Include organization ID if available for org-specific limits
    const orgId = request.headers['x-org-id'] as string;
    
    // Include endpoint for endpoint-specific limits
    const endpoint = request.route?.path || request.path;
    
    return `rate_limit:${ip}:${userId || 'anonymous'}:${orgId || 'no-org'}:${endpoint}`;
  }

  private getClientIP(request: Request): string {
    // Check for forwarded headers (trusted proxies)
    const forwardedFor = request.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      // Get the first IP in the chain
      return forwardedFor.split(',')[0].trim();
    }
    
    // Check for real IP header
    const realIP = request.headers['x-real-ip'] as string;
    if (realIP) {
      return realIP;
    }
    
    // Fallback to connection remote address
    return request.connection?.remoteAddress || 
           request.socket?.remoteAddress || 
           'unknown';
  }

  private shouldSkipRateLimit(request: Request): boolean {
    const skipPaths = [
      '/api/health',
      '/api/ready',
      '/api/metrics',
      '/api/health/info',
    ];
    
    return skipPaths.some(path => request.path.startsWith(path));
  }

  // Cleanup expired rate limit records (call periodically)
  cleanupExpiredRecords(): void {
    const currentTime = Date.now();
    for (const [key, record] of this.rateLimitStore.entries()) {
      if (currentTime > record.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}
