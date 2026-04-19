import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

function mockContext(
  method: string,
  path: string,
  cookies: Record<string, string> | undefined,
  headers: Record<string, string>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        path,
        cookies,
        headers,
      }),
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it('allows POST /api/auth/register without CSRF (self-serve signup)', () => {
    const ctx = mockContext('POST', '/api/auth/register', undefined, {});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows POST /api/auth/organization/signup without CSRF', () => {
    const ctx = mockContext('POST', '/api/auth/organization/signup', undefined, {});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('requires CSRF for POST /api/workspaces when cookie/header missing', () => {
    const ctx = mockContext('POST', '/api/workspaces', undefined, {});
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows POST /api/workspaces when cookie and header match', () => {
    const token = 'same-token';
    const ctx = mockContext(
      'POST',
      '/api/workspaces',
      { 'XSRF-TOKEN': token },
      { 'x-csrf-token': token },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
