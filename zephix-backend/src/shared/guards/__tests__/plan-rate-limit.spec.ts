/**
 * Phase 3D: Plan-Aware Rate Limiter Tests
 */
import { PlanRateLimitGuard } from '../plan-rate-limit.guard';
import { RATE_LIMIT_TIERS } from '../rate-limit.config';
import { HttpException } from '@nestjs/common';

describe('PlanRateLimitGuard', () => {
  let guard: PlanRateLimitGuard;
  let mockReflector: any;

  beforeEach(() => {
    mockReflector = {
      get: jest.fn().mockReturnValue(null),
    };
    guard = new PlanRateLimitGuard(mockReflector);
  });

  const makeContext = (user?: any, path = '/api/test') => {
    const mockSetHeader = jest.fn();
    const reqObj = {
      user,
      path,
      route: { path },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const resObj = { setHeader: mockSetHeader };
    return {
      switchToHttp: () => ({
        getRequest: () => reqObj,
        getResponse: () => resObj,
      }),
      getHandler: () => ({}),
      _res: resObj,
    } as any;
  };

  it('allows request when no tier decorator is set', async () => {
    mockReflector.get.mockReturnValue(null);
    const result = await guard.canActivate(makeContext());
    expect(result).toBe(true);
  });

  it('allows first request within limit', async () => {
    mockReflector.get.mockReturnValue('standard');
    const result = await guard.canActivate(makeContext({ id: 'u1' }));
    expect(result).toBe(true);
  });

  it('blocks request when limit exceeded', async () => {
    mockReflector.get.mockReturnValue('compute');
    const ctx = makeContext({ id: 'u1' });

    // Exhaust the compute limit (baseMax = 5)
    for (let i = 0; i < 5; i++) {
      await guard.canActivate(ctx);
    }

    // 6th request should be blocked
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  it('applies plan multiplier to limit', async () => {
    mockReflector.get.mockReturnValue('compute');
    // rateLimitMultiplier = 2 → 5 * 2 = 10 allowed
    const ctx = makeContext({ id: 'u2', rateLimitMultiplier: 2 });

    for (let i = 0; i < 10; i++) {
      await guard.canActivate(ctx);
    }

    // 11th should fail
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  it('sets X-RateLimit-Limit header', async () => {
    mockReflector.get.mockReturnValue('standard');
    const ctx = makeContext({ id: 'u3' });
    await guard.canActivate(ctx);

    expect(ctx._res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 30);
  });

  it('sets X-RateLimit-Remaining header', async () => {
    mockReflector.get.mockReturnValue('standard');
    const ctx = makeContext({ id: 'u4' });
    await guard.canActivate(ctx);

    expect(ctx._res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 29);
  });

  it('throws with RATE_LIMITED code and Retry-After header', async () => {
    mockReflector.get.mockReturnValue('compute');
    const ctx = makeContext({ id: 'u5' });

    // Exhaust
    for (let i = 0; i < 5; i++) {
      await guard.canActivate(ctx);
    }

    try {
      await guard.canActivate(ctx);
      fail('Expected HttpException');
    } catch (err: any) {
      expect(err.getStatus()).toBe(429);
      const body = err.getResponse();
      expect(body.code).toBe('RATE_LIMITED');
      expect(body.retryAfter).toBeGreaterThan(0);
    }
  });

  it('skips rate limiting for health endpoints', async () => {
    mockReflector.get.mockReturnValue('standard');
    const ctx = makeContext({ id: 'u6' }, '/api/health/live');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});

describe('RATE_LIMIT_TIERS config', () => {
  it('defines standard tier', () => {
    expect(RATE_LIMIT_TIERS.standard).toBeDefined();
    expect(RATE_LIMIT_TIERS.standard.baseMax).toBe(30);
    expect(RATE_LIMIT_TIERS.standard.windowMs).toBe(60_000);
  });

  it('defines compute tier with lower limit', () => {
    expect(RATE_LIMIT_TIERS.compute).toBeDefined();
    expect(RATE_LIMIT_TIERS.compute.baseMax).toBe(5);
  });

  it('defines storage tier', () => {
    expect(RATE_LIMIT_TIERS.storage).toBeDefined();
    expect(RATE_LIMIT_TIERS.storage.baseMax).toBe(20);
  });

  it('defines auth tier with longer window', () => {
    expect(RATE_LIMIT_TIERS.auth).toBeDefined();
    expect(RATE_LIMIT_TIERS.auth.windowMs).toBe(900_000);
  });

  it('defines admin tier', () => {
    expect(RATE_LIMIT_TIERS.admin).toBeDefined();
    expect(RATE_LIMIT_TIERS.admin.baseMax).toBe(10);
  });
});
