import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorage } from '@nestjs/throttler/dist/throttler-storage.interface';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';

@Injectable()
export class AuthRateLimitGuard extends ThrottlerGuard {
  private redis: Redis | null;

  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
    // Initialize Redis connection with error handling
    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      this.redis.on('error', (err) => {
        console.warn('Redis connection error:', err.message);
        // Fall back to in-memory storage if Redis fails
        this.redis = null;
      });
    } catch (error) {
      console.warn('Redis not available, using in-memory rate limiting:', error.message);
      this.redis = null;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const email = request.body?.email;

    // If Redis is not available, fall back to basic throttling
    if (!this.redis) {
      console.warn('Redis not available, using basic throttling only');
      return super.canActivate(context);
    }

    try {
      // Check IP-based rate limit
      const ipKey = `rate:ip:${ip}:login`;
      const ipCount = await this.redis.incr(ipKey);
      if (ipCount === 1) {
        await this.redis.expire(ipKey, 60); // 60 second window
      }
      if (ipCount > 5) {
        throw new HttpException('Too many attempts from this IP', HttpStatus.TOO_MANY_REQUESTS);
      }

      // Check account-based rate limit
      if (email) {
        const accountKey = `rate:account:${email}:login`;
        const accountCount = await this.redis.incr(accountKey);
        if (accountCount === 1) {
          await this.redis.expire(accountKey, 60);
        }
        if (accountCount > 5) {
          throw new HttpException('Too many attempts for this account', HttpStatus.TOO_MANY_REQUESTS);
        }

        // Check lockout
        const lockKey = `lock:account:${email}`;
        const totalFailuresKey = `failures:account:${email}`;
        
        const isLocked = await this.redis.get(lockKey);
        if (isLocked) {
          throw new HttpException('Account temporarily locked', HttpStatus.FORBIDDEN);
        }

        // Track failures for lockout
        const failures = await this.redis.get(totalFailuresKey);
        if (parseInt(failures || '0') >= 10) {
          await this.redis.setex(lockKey, 900, '1'); // Lock for 15 minutes
          await this.redis.del(totalFailuresKey);
          throw new HttpException('Account locked due to multiple failed attempts', HttpStatus.FORBIDDEN);
        }
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // If Redis is down, allow the request but log the error
      console.error('Rate limiting error:', error);
      return super.canActivate(context);
    }
  }

  async recordFailure(email: string): Promise<void> {
    if (!this.redis) return;
    
    try {
      const failuresKey = `failures:account:${email}`;
      await this.redis.incr(failuresKey);
      await this.redis.expire(failuresKey, 3600); // Reset after 1 hour
    } catch (error) {
      console.error('Failed to record failure:', error);
    }
  }

  async recordSuccess(email: string): Promise<void> {
    if (!this.redis) return;
    
    try {
      // Reset failure count on successful login
      const failuresKey = `failures:account:${email}`;
      await this.redis.del(failuresKey);
    } catch (error) {
      console.error('Failed to record success:', error);
    }
  }
}
