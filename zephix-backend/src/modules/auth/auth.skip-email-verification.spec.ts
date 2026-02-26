import { AuthService } from './auth.service';
import { ForbiddenException } from '@nestjs/common';
import {
  assertStagingEmailVerificationBypassGuardrails,
  shouldBypassEmailVerificationForEmail,
} from './services/staging-email-verification-bypass';

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../common/security/token-hash.util', () => ({
  TokenHashUtil: {
    hashRefreshToken: jest.fn().mockReturnValue('hashed-refresh-token'),
    verifyRefreshToken: jest.fn().mockReturnValue(true),
  },
}));

describe('AuthService login (skip email verification)', () => {
  it('allows login for unverified user when skip flag is enabled', async () => {
    const prevZephixEnv = process.env.ZEPHIX_ENV;
    const prevSkipFlag = process.env.STAGING_SKIP_EMAIL_VERIFICATION;
    const prevDomains = process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS;
    const prevJwtSecret = process.env.JWT_SECRET;
    const prevJwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = 'true';
    process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS = 'example.com,zephix.local';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-bytes-minimum';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-32-bytes-minimum';

    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        password:
          '$2b$10$Xy5QvQh19sqMZWfByz1FHefLldm8rsQqP8c8QiUXQ8KyyfXJJM4Q.', // TestPass123!
        firstName: 'Test',
        lastName: 'User',
        role: 'member',
        organizationId: null,
        isEmailVerified: false,
        emailVerifiedAt: null,
        isActive: true,
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const authSessionRepository = {
      create: jest.fn((v) => ({ ...v })),
      save: jest
        .fn()
        .mockResolvedValueOnce({ id: 'session-1' })
        .mockResolvedValueOnce({ id: 'session-1' }),
    };
    const jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };
    const rateLimitStore = {
      hit: jest
        .fn()
        .mockResolvedValue({ allowed: true, remaining: Number.MAX_SAFE_INTEGER }),
    };

    const service = new AuthService(
      userRepository as any,
      {} as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
      authSessionRepository as any,
      {} as any,
      jwtService as any,
      {} as any,
      rateLimitStore as any,
    );

    const result = await service.login({
      email: 'user@example.com',
      password: 'TestPass123!',
    });

    expect(result.accessToken).toBe('signed-token');
    expect(result.refreshToken).toBe('signed-token');
    expect(result.sessionId).toBe('session-1');
    expect(rateLimitStore.hit).toHaveBeenCalledWith(
      expect.stringContaining('auth:success:'),
      60,
      1_000_000,
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        isEmailVerified: true,
      }),
    );

    process.env.ZEPHIX_ENV = prevZephixEnv;
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = prevSkipFlag;
    process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS = prevDomains;
    process.env.JWT_SECRET = prevJwtSecret;
    process.env.JWT_REFRESH_SECRET = prevJwtRefreshSecret;
  });

  it('rejects unverified user login in staging when bypass flag is disabled', async () => {
    const prevZephixEnv = process.env.ZEPHIX_ENV;
    const prevSkipFlag = process.env.STAGING_SKIP_EMAIL_VERIFICATION;
    const prevDomains = process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS;
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = 'false';
    process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS = 'example.com';

    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-2',
        email: 'user@example.com',
        password:
          '$2b$10$Xy5QvQh19sqMZWfByz1FHefLldm8rsQqP8c8QiUXQ8KyyfXJJM4Q.',
        role: 'member',
        organizationId: 'org-1',
        isEmailVerified: false,
        emailVerifiedAt: null,
      }),
      update: jest.fn(),
    };

    const service = new AuthService(
      userRepository as any,
      {} as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
      { create: jest.fn(), save: jest.fn() } as any,
      {} as any,
      { sign: jest.fn().mockReturnValue('token') } as any,
      {} as any,
      {
        hit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999 }),
      } as any,
    );

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'TestPass123!',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    process.env.ZEPHIX_ENV = prevZephixEnv;
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = prevSkipFlag;
    process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS = prevDomains;
  });

  it('parses allowlist with spaces and case-insensitive domains', () => {
    const prevZephixEnv = process.env.ZEPHIX_ENV;
    const prevSkipFlag = process.env.STAGING_SKIP_EMAIL_VERIFICATION;
    const prevDomains = process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS;
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = 'true';
    process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS =
      ' example.com , ZEPHIX.LOCAL ';

    expect(
      shouldBypassEmailVerificationForEmail('USER@EXAMPLE.COM'),
    ).toBe(true);
    expect(
      shouldBypassEmailVerificationForEmail('proof@zephix.local'),
    ).toBe(true);

    process.env.ZEPHIX_ENV = prevZephixEnv;
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = prevSkipFlag;
    process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS = prevDomains;
  });

  it('rejects unverified user login when bypass flag is enabled but domain is not allowed', async () => {
    const prevZephixEnv = process.env.ZEPHIX_ENV;
    const prevSkipFlag = process.env.STAGING_SKIP_EMAIL_VERIFICATION;
    const prevDomains = process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS;
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = 'true';
    process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS = 'example.com';

    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-3',
        email: 'user@unauthorized.dev',
        password:
          '$2b$10$Xy5QvQh19sqMZWfByz1FHefLldm8rsQqP8c8QiUXQ8KyyfXJJM4Q.',
        role: 'member',
        organizationId: 'org-1',
        isEmailVerified: false,
        emailVerifiedAt: null,
      }),
      update: jest.fn(),
    };

    const service = new AuthService(
      userRepository as any,
      {} as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
      { create: jest.fn(), save: jest.fn() } as any,
      {} as any,
      { sign: jest.fn().mockReturnValue('token') } as any,
      {} as any,
      {
        hit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999 }),
      } as any,
    );

    await expect(
      service.login({
        email: 'user@unauthorized.dev',
        password: 'TestPass123!',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    process.env.ZEPHIX_ENV = prevZephixEnv;
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = prevSkipFlag;
    process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS = prevDomains;
  });

  it('throws on startup guardrail when bypass flag is enabled outside staging', () => {
    const prevZephixEnv = process.env.ZEPHIX_ENV;
    const prevNodeEnv = process.env.NODE_ENV;
    const prevSkipFlag = process.env.STAGING_SKIP_EMAIL_VERIFICATION;

    process.env.ZEPHIX_ENV = 'production';
    process.env.NODE_ENV = 'production';
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = 'true';

    expect(() => assertStagingEmailVerificationBypassGuardrails()).toThrow(
      'STAGING_SKIP_EMAIL_VERIFICATION=true is only allowed when runtime environment is staging',
    );

    process.env.ZEPHIX_ENV = prevZephixEnv;
    process.env.NODE_ENV = prevNodeEnv;
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = prevSkipFlag;
  });
});
