import { ForbiddenException } from '@nestjs/common';
import { SmokeKeyGuard } from './smoke-key.guard';

describe('SmokeKeyGuard', () => {
  const guard = new SmokeKeyGuard();

  function contextWithHeaders(headers: Record<string, string>) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as any;
  }

  it('allows request when runtime/header/key are valid', () => {
    const prevEnv = process.env.ZEPHIX_ENV;
    const prevKey = process.env.STAGING_SMOKE_KEY;
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SMOKE_KEY = 'smoke-key-123';

    expect(
      guard.canActivate(
        contextWithHeaders({
          'x-zephix-env': 'staging',
          'x-smoke-key': 'smoke-key-123',
        }),
      ),
    ).toBe(true);

    process.env.ZEPHIX_ENV = prevEnv;
    process.env.STAGING_SMOKE_KEY = prevKey;
  });

  it('rejects non-staging runtime', () => {
    const prevEnv = process.env.ZEPHIX_ENV;
    const prevKey = process.env.STAGING_SMOKE_KEY;
    process.env.ZEPHIX_ENV = 'production';
    process.env.STAGING_SMOKE_KEY = 'smoke-key-123';

    expect(() =>
      guard.canActivate(
        contextWithHeaders({
          'x-zephix-env': 'staging',
          'x-smoke-key': 'smoke-key-123',
        }),
      ),
    ).toThrow(ForbiddenException);

    process.env.ZEPHIX_ENV = prevEnv;
    process.env.STAGING_SMOKE_KEY = prevKey;
  });

  it('rejects invalid smoke key', () => {
    const prevEnv = process.env.ZEPHIX_ENV;
    const prevKey = process.env.STAGING_SMOKE_KEY;
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SMOKE_KEY = 'smoke-key-123';

    expect(() =>
      guard.canActivate(
        contextWithHeaders({
          'x-zephix-env': 'staging',
          'x-smoke-key': 'wrong-key',
        }),
      ),
    ).toThrow(ForbiddenException);

    process.env.ZEPHIX_ENV = prevEnv;
    process.env.STAGING_SMOKE_KEY = prevKey;
  });
});
