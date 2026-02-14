/**
 * Phase 3D: Security Headers Middleware Tests
 */
import { SecurityHeadersMiddleware } from '../security-headers.middleware';

describe('SecurityHeadersMiddleware', () => {
  let middleware: SecurityHeadersMiddleware;
  let headers: Record<string, string>;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    middleware = new SecurityHeadersMiddleware();
    headers = {};
    res = {
      setHeader: jest.fn((key: string, value: string) => {
        headers[key] = value;
      }),
    };
    next = jest.fn();
  });

  it('sets Strict-Transport-Security header', () => {
    middleware.use({} as any, res, next);
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
    expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
  });

  it('sets X-Content-Type-Options to nosniff', () => {
    middleware.use({} as any, res, next);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('sets X-Frame-Options to DENY', () => {
    middleware.use({} as any, res, next);
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('sets Referrer-Policy', () => {
    middleware.use({} as any, res, next);
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('sets Content-Security-Policy', () => {
    middleware.use({} as any, res, next);
    expect(headers['Content-Security-Policy']).toContain("default-src 'none'");
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });

  it('sets Permissions-Policy', () => {
    middleware.use({} as any, res, next);
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['Permissions-Policy']).toContain('microphone=()');
  });

  it('calls next()', () => {
    middleware.use({} as any, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
