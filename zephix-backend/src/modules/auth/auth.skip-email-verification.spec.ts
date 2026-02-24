import { DataSource } from 'typeorm';
import { AuthRegistrationService } from './services/auth-registration.service';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { AuthOutbox } from './entities/auth-outbox.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../common/security/token-hash.util', () => ({
  TokenHashUtil: {
    hashRefreshToken: jest.fn().mockReturnValue('hashed-refresh-token'),
    verifyRefreshToken: jest.fn().mockReturnValue(true),
  },
}));

describe('skip email verification policy (staging)', () => {
  it('registration marks user verified and skips token/outbox in staging', async () => {
    const prevEnv = process.env.ZEPHIX_ENV;
    const prevSkip = process.env.SKIP_EMAIL_VERIFICATION;
    process.env.ZEPHIX_ENV = 'staging';
    process.env.SKIP_EMAIL_VERIFICATION = 'true';

    const userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
      }),
    };
    const orgRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({
        id: 'org-1',
        name: 'Staging Org',
        slug: 'staging-org',
        status: 'trial',
      }),
    };
    const userOrgRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({ id: 'user-org-1' }),
    };
    const tokenRepo = {
      create: jest.fn((v) => v),
      save: jest.fn(),
    };
    const outboxRepo = {
      create: jest.fn((v) => v),
      save: jest.fn(),
    };

    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === User) return userRepo;
        if (entity === Organization) return orgRepo;
        if (entity === UserOrganization) return userOrgRepo;
        if (entity === EmailVerificationToken) return tokenRepo;
        if (entity === AuthOutbox) return outboxRepo;
        throw new Error('Unexpected repository request');
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (cb: any) => cb(manager)),
    } as unknown as DataSource;

    const service = new AuthRegistrationService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource,
      { record: jest.fn().mockResolvedValue(undefined) } as any,
    );

    await service.registerSelfServe({
      email: 'staging-test-01@zephix.local',
      password: 'ZephixTest123!',
      fullName: 'Staging Test',
      orgName: 'Staging Org',
    });

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        isEmailVerified: true,
        emailVerifiedAt: expect.any(Date),
      }),
    );
    expect(tokenRepo.save).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();

    process.env.ZEPHIX_ENV = prevEnv;
    process.env.SKIP_EMAIL_VERIFICATION = prevSkip;
  });

  it('login allows unverified existing user and flips verified in staging', async () => {
    const prevEnv = process.env.ZEPHIX_ENV;
    const prevSkip = process.env.SKIP_EMAIL_VERIFICATION;
    const prevJwt = process.env.JWT_SECRET;
    const prevRefresh = process.env.JWT_REFRESH_SECRET;
    process.env.ZEPHIX_ENV = 'staging';
    process.env.SKIP_EMAIL_VERIFICATION = 'true';
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || 'test-jwt-secret-32-bytes-minimum';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-32-bytes-minimum';

    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'staging-test-01@zephix.local',
        password: 'hashed',
        firstName: 'Staging',
        lastName: 'Test',
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

    const service = new AuthService(
      userRepository as any,
      {} as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
      authSessionRepository as any,
      {} as any,
      jwtService as any,
      {} as any,
    );

    const result = await service.login({
      email: 'staging-test-01@zephix.local',
      password: 'ZephixTest123!',
    });

    expect(result.accessToken).toBe('signed-token');
    expect(result.refreshToken).toBe('signed-token');
    expect(userRepository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        isEmailVerified: true,
        emailVerifiedAt: expect.any(Date),
      }),
    );

    process.env.ZEPHIX_ENV = prevEnv;
    process.env.SKIP_EMAIL_VERIFICATION = prevSkip;
    process.env.JWT_SECRET = prevJwt;
    process.env.JWT_REFRESH_SECRET = prevRefresh;
  });
});

