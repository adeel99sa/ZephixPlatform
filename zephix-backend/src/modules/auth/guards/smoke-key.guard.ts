import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { getZephixEnv } from '../../../common/utils/runtime-env';

@Injectable()
export class SmokeKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const smokeKey = String(request.headers['x-smoke-key'] || '').trim();
    const expectedKey = String(process.env.STAGING_SMOKE_KEY || '').trim();
    const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();
    const zephixEnv = getZephixEnv();

    if (nodeEnv !== 'staging' || zephixEnv !== 'staging') {
      throw new ForbiddenException('Smoke login is only available in staging');
    }
    if (!smokeKey) {
      throw new ForbiddenException('X-Smoke-Key header is required');
    }
    if (!expectedKey) {
      throw new ForbiddenException('STAGING_SMOKE_KEY is not configured');
    }
    if (!constantTimeEquals(smokeKey, expectedKey)) {
      throw new ForbiddenException('Invalid smoke key');
    }
    return true;
  }
}

function constantTimeEquals(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(actualBuffer, expectedBuffer);
}
