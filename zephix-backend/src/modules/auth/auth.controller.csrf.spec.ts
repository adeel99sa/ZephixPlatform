import { AuthController } from './auth.controller';

describe('AuthController CSRF cookie policy', () => {
  it('sets SameSite=None and Secure=true in staging', () => {
    const prevEnv = process.env.ZEPHIX_ENV;
    process.env.ZEPHIX_ENV = 'staging';

    const controller = new AuthController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const req = {
      headers: {
        host: 'zephix-backend-staging-staging.up.railway.app',
        'x-forwarded-proto': 'https',
      },
      get: () => 'zephix-backend-staging-staging.up.railway.app',
    } as any;

    const cookie = jest.fn();
    const json = jest.fn().mockImplementation(v => v);
    const res = { cookie, json } as any;

    const result = controller.getCsrfToken(req, res);

    expect(cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        path: '/',
      }),
    );
    expect(result).toHaveProperty('csrfToken');

    process.env.ZEPHIX_ENV = prevEnv;
  });

  it('sets SameSite=None on Railway *.up.railway.app even when ZEPHIX_ENV is unset', () => {
    const prevEnv = process.env.ZEPHIX_ENV;
    delete process.env.ZEPHIX_ENV;

    const controller = new AuthController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const req = {
      headers: {
        host: 'zephix-backend-staging.up.railway.app',
        'x-forwarded-proto': 'https',
      },
      get: () => 'zephix-backend-staging.up.railway.app',
    } as any;

    const cookie = jest.fn();
    const json = jest.fn().mockImplementation((v) => v);
    const res = { cookie, json } as any;

    controller.getCsrfToken(req, res);

    expect(cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({
        sameSite: 'none',
        secure: true,
      }),
    );

    if (prevEnv === undefined) {
      delete process.env.ZEPHIX_ENV;
    } else {
      process.env.ZEPHIX_ENV = prevEnv;
    }
  });
});

