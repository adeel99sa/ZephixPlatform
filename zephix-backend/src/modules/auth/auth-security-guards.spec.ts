import 'reflect-metadata';
import { AuthController } from './auth.controller';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Verify that security guards are correctly applied to auth endpoints.
 *
 * These tests use Reflect metadata to confirm guard decorators are present,
 * ensuring enforcement is not accidentally removed during refactoring.
 */
describe('AuthController — Security Guard Enforcement', () => {
  function getMethodGuards(target: any, method: string): Function[] {
    const guards = Reflect.getMetadata('__guards__', target[method]) || [];
    return guards.map((g: any) => (typeof g === 'function' ? g : g?.constructor));
  }

  const proto = AuthController.prototype;

  // ── Public write endpoints MUST have RateLimiterGuard ─────────────

  it('POST /auth/register has RateLimiterGuard', () => {
    const guards = getMethodGuards(proto, 'register');
    expect(guards).toContain(RateLimiterGuard);
  });

  it('POST /auth/resend-verification has RateLimiterGuard', () => {
    const guards = getMethodGuards(proto, 'resendVerification');
    expect(guards).toContain(RateLimiterGuard);
  });

  it('GET /auth/verify-email has RateLimiterGuard', () => {
    const guards = getMethodGuards(proto, 'verifyEmail');
    expect(guards).toContain(RateLimiterGuard);
  });

  it('POST /auth/login has RateLimiterGuard', () => {
    const guards = getMethodGuards(proto, 'login');
    expect(guards).toContain(RateLimiterGuard);
  });

  it('POST /auth/refresh has RateLimiterGuard', () => {
    const guards = getMethodGuards(proto, 'refreshToken');
    expect(guards).toContain(RateLimiterGuard);
  });

  // ── Authenticated endpoints MUST have JwtAuthGuard ────────────────

  it('GET /auth/me has JwtAuthGuard', () => {
    const guards = getMethodGuards(proto, 'getProfile');
    expect(guards).toContain(JwtAuthGuard);
  });

  it('POST /auth/logout has JwtAuthGuard', () => {
    const guards = getMethodGuards(proto, 'logout');
    expect(guards).toContain(JwtAuthGuard);
  });

  // ── Ensure no @Throttle ghost metadata (it was non-functional) ────

  it('register does NOT have dead @Throttle metadata', () => {
    const meta = Reflect.getMetadata('THROTTLER:LIMIT', proto.register);
    expect(meta).toBeUndefined();
  });

  it('resendVerification does NOT have dead @Throttle metadata', () => {
    const meta = Reflect.getMetadata('THROTTLER:LIMIT', proto.resendVerification);
    expect(meta).toBeUndefined();
  });
});
