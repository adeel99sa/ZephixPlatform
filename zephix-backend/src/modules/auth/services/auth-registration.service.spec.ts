import { DataSource } from 'typeorm';
import { AuthRegistrationService } from './auth-registration.service';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { AuthOutbox } from '../entities/auth-outbox.entity';
import { AuditAction } from '../../audit/audit.constants';

describe('AuthRegistrationService (skip email verification)', () => {
  it('marks user verified and skips outbox when skip flag is enabled', async () => {
    const prevZephixEnv = process.env.ZEPHIX_ENV;
    const prevSkipFlag = process.env.STAGING_SKIP_EMAIL_VERIFICATION;
    const prevDomains = process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS;
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = 'true';
    process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS = 'example.com,zephix.local';

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
        name: 'Acme Group',
        slug: 'acme-group',
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

    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AuthRegistrationService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource,
      auditService as any,
    );

    const result = await service.registerSelfServe({
      email: 'staging.test@example.com',
      password: 'Passw0rd!@#',
      fullName: 'Test User',
      orgName: 'Acme Group',
    });

    expect(result).toEqual({
      message:
        'If an account with this email exists, you will receive a verification email.',
    });
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        isEmailVerified: true,
      }),
    );
    expect(tokenRepo.save).not.toHaveBeenCalled();
    expect(outboxRepo.save).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.EMAIL_VERIFICATION_SENT,
      }),
    );

    process.env.ZEPHIX_ENV = prevZephixEnv;
    process.env.STAGING_SKIP_EMAIL_VERIFICATION = prevSkipFlag;
    process.env.STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS = prevDomains;
  });
});
