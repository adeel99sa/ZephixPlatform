import 'reflect-metadata';

import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { DemoRequestController } from './demo-request.controller';

describe('DemoRequestController', () => {
  function getMethodGuards(target: object, method: string): Function[] {
    const fn = (target as Record<string, unknown>)[method];
    const guards = Reflect.getMetadata('__guards__', fn) || [];
    return guards.map((g: unknown) =>
      typeof g === 'function' ? g : (g as { constructor: Function }).constructor,
    );
  }

  it('POST createDemoRequest has RateLimiterGuard', () => {
    const guards = getMethodGuards(DemoRequestController.prototype, 'createDemoRequest');
    expect(guards).toContain(RateLimiterGuard);
  });
});
