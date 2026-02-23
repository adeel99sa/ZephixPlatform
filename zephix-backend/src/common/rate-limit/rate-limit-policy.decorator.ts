import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
  RateLimitPolicy,
  RATE_LIMIT_POLICY_KEY,
  RATE_LIMIT_OVERRIDES_KEY,
} from './rate-limit.constants';

/**
 * Sets the rate limit policy for a controller method or class.
 *
 * Usage:
 *   @RateLimit(RateLimitPolicy.AUTH_LOGIN)
 *   @RateLimit(RateLimitPolicy.COMPUTE, { max: 10 })
 */
export function RateLimit(
  policy: RateLimitPolicy,
  overrides?: { windowMs?: number; max?: number },
): MethodDecorator & ClassDecorator {
  const decorators = [SetMetadata(RATE_LIMIT_POLICY_KEY, policy)];
  if (overrides) {
    decorators.push(SetMetadata(RATE_LIMIT_OVERRIDES_KEY, overrides));
  }
  return applyDecorators(...decorators);
}
