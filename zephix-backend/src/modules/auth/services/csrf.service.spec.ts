import { CsrfService } from './csrf.service';

describe('CsrfService', () => {
  let service: CsrfService;

  beforeEach(() => {
    service = new CsrfService();
  });

  it('generates a 64-char hex token', () => {
    const token = service.generateToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('deriveSecureCookieFlag returns false for localhost', () => {
    const req = {
      headers: { host: 'localhost:3000' },
      get: () => 'localhost:3000',
      secure: false,
    } as any;

    expect(service.deriveSecureCookieFlag(req)).toBe(false);
  });

  it('deriveSecureCookieFlag returns true when req.secure is true', () => {
    const req = {
      headers: { host: 'zephix-backend-v2-staging.up.railway.app' },
      get: () => 'zephix-backend-v2-staging.up.railway.app',
      secure: true,
    } as any;

    expect(service.deriveSecureCookieFlag(req)).toBe(true);
  });

  it('deriveSecureCookieFlag falls back to x-forwarded-proto=https', () => {
    const req = {
      headers: {
        host: 'zephix-backend-v2-staging.up.railway.app',
        'x-forwarded-proto': 'https',
      },
      get: () => 'zephix-backend-v2-staging.up.railway.app',
      secure: false,
    } as any;

    expect(service.deriveSecureCookieFlag(req)).toBe(true);
  });

  it('setCsrfCookie applies expected cookie options', () => {
    const req = {
      headers: { host: 'localhost:3000' },
      get: () => 'localhost:3000',
      secure: false,
    } as any;
    const cookie = jest.fn();
    const res = { cookie } as any;

    service.setCsrfCookie(req, res, 'abc123');

    expect(cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      'abc123',
      expect.objectContaining({
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });
});
