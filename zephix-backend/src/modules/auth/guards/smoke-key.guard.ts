import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import {
  getZephixEnv,
  isProductionRuntime,
} from '../../../common/utils/runtime-env';

@Injectable()
export class SmokeKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const zephixEnv = getZephixEnv();
    const isProductionMode = isProductionRuntime();

    if (!isProductionMode || zephixEnv !== 'staging') {
      // 404 — do not disclose route existence outside staging.
      // Env check runs before reading any request headers to avoid
      // even loading key/header values in non-staging contexts.
      throw new NotFoundException();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const smokeKey = String(request.headers['x-smoke-key'] || '').trim();
    const expectedKey = String(process.env.STAGING_SMOKE_KEY || '').trim();
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
