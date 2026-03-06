import { ForbiddenException } from '@nestjs/common';
import { SmokeKeyGuard } from './smoke-key.guard';

describe('SmokeKeyGuard', () => {
  const guard = new SmokeKeyGuard();
  const originalNodeEnv = process.env.NODE_ENV;
  const originalZephixEnv = process.env.ZEPHIX_ENV;
  const originalSmokeKey = process.env.STAGING_SMOKE_KEY;

  function contextWithHeaders(headers: Record<string, string>) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as any;
  }

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ZEPHIX_ENV = originalZephixEnv;
    process.env.STAGING_SMOKE_KEY = originalSmokeKey;
  });

  it('allows request when runtime and key are valid', () => {
    process.env.NODE_ENV = 'staging';
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SMOKE_KEY = 'smoke-key-123';

    expect(
      guard.canActivate(
        contextWithHeaders({
          'x-smoke-key': 'smoke-key-123',
        }),
      ),
    ).toBe(true);

  });

  it('rejects non-staging zephix runtime', () => {
    process.env.NODE_ENV = 'staging';
    process.env.ZEPHIX_ENV = 'production';
    process.env.STAGING_SMOKE_KEY = 'smoke-key-123';

    expect(() =>
      guard.canActivate(
        contextWithHeaders({
          'x-smoke-key': 'smoke-key-123',
        }),
      ),
    ).toThrow(ForbiddenException);

  });

  it('rejects non-staging node runtime', () => {
    process.env.NODE_ENV = 'production';
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SMOKE_KEY = 'smoke-key-123';

    expect(() =>
      guard.canActivate(
        contextWithHeaders({
          'x-smoke-key': 'smoke-key-123',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects invalid smoke key', () => {
    process.env.NODE_ENV = 'staging';
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SMOKE_KEY = 'smoke-key-123';

    expect(() =>
      guard.canActivate(
        contextWithHeaders({
          'x-smoke-key': 'wrong-key',
        }),
      ),
    ).toThrow(ForbiddenException);

  });
});
