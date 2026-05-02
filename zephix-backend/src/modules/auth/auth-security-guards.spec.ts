import 'reflect-metadata';
import { AuthController } from './auth.controller';
import { AUDIT_GUARD_DECISION_METADATA_KEY } from '../../common/audit/guard-audit.constants';
import { IS_PUBLIC_KEY } from '../../common/auth/public.decorator';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { SmokeKeyGuard } from './guards/smoke-key.guard';

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

  it('POST /auth/smoke-login has RateLimiterGuard and SmokeKeyGuard', () => {
    const guards = getMethodGuards(proto, 'smokeLogin');
    expect(guards).toContain(RateLimiterGuard);
    expect(guards).toContain(SmokeKeyGuard);
  });

  it('POST /auth/smoke-login is not marked @Public()', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto.smokeLogin)).not.toBe(true);
  });

  // ── Explicit @Public() metadata (AD-027 Gate 2) ─────────────────────────

  it('public auth handlers carry IS_PUBLIC_KEY metadata', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto.register)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto.resendVerification)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto.forgotPassword)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto.postResetPassword)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto.verifyEmail)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto.login)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto.refreshToken)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto.getCsrfToken)).toBe(true);
  });

  it('POST /auth/refresh has RateLimiterGuard', () => {
    const guards = getMethodGuards(proto, 'refreshToken');
    expect(guards).toContain(RateLimiterGuard);
  });

  it('POST /auth/forgot-password has RateLimiterGuard', () => {
    const guards = getMethodGuards(proto, 'forgotPassword');
    expect(guards).toContain(RateLimiterGuard);
  });

  it('POST /auth/reset-password has RateLimiterGuard', () => {
    const guards = getMethodGuards(proto, 'postResetPassword');
    expect(guards).toContain(RateLimiterGuard);
  });

  // ── Authenticated endpoints MUST have guard enforcement ────────────────

  it('GET /auth/me has OptionalJwtAuthGuard', () => {
    const guards = getMethodGuards(proto, 'getProfile');
    expect(guards).toContain(OptionalJwtAuthGuard);
  });

  it('POST /auth/logout has JwtAuthGuard', () => {
    const guards = getMethodGuards(proto, 'logout');
    expect(guards).toContain(JwtAuthGuard);
  });

  it('GET /auth/profile has JwtAuthGuard', () => {
    const guards = getMethodGuards(proto, 'getAccountProfile');
    expect(guards).toContain(JwtAuthGuard);
  });

  it('PATCH /auth/profile has JwtAuthGuard', () => {
    const guards = getMethodGuards(proto, 'patchAccountProfile');
    expect(guards).toContain(JwtAuthGuard);
  });

  it('POST /auth/change-password has JwtAuthGuard', () => {
    const guards = getMethodGuards(proto, 'postChangePassword');
    expect(guards).toContain(JwtAuthGuard);
  });

  it('POST /auth/change-password has config AuditGuardDecision (AD-027)', () => {
    const meta = Reflect.getMetadata(
      AUDIT_GUARD_DECISION_METADATA_KEY,
      proto.postChangePassword,
    );
    expect(meta?.action).toBe('config');
    expect(meta?.scope).toBe('global');
    expect(meta?.requiredRole).toBe('authenticated');
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
