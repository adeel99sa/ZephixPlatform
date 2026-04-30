import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { AuthSession } from '../entities/auth-session.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../../shared/services/email.service';
import { AuditService } from '../../audit/services/audit.service';
import { OrgProvisioningService } from '../services/org-provisioning.service';
import { TokenHashUtil } from '../../../common/security/token-hash.util';
import { AUTH_RATE_LIMIT_STORE } from '../tokens';

/** Test-only in-memory store for per-email password-reset rate limits */
class MemoryPwdResetRateLimitStore {
  private hits = new Map<string, number>();

  async hit(
    key: string,
    _windowSeconds: number,
    limit: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const n = (this.hits.get(key) ?? 0) + 1;
    this.hits.set(key, n);
    return {
      allowed: n <= limit,
      remaining: Math.max(0, limit - n),
    };
  }
}

describe('AuthService — password reset', () => {
  const OLD_TOKEN_SECRET = process.env.TOKEN_HASH_SECRET;
  const OLD_PEPPER = process.env.REFRESH_TOKEN_PEPPER;

  let service: AuthService;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
  let pwdResetRepo: any;
  let sessionRepo: jest.Mocked<Partial<Repository<AuthSession>>>;
  let refreshTokenRepo: jest.Mocked<Partial<Repository<RefreshToken>>>;
  let emailService: {
    sendPasswordResetEmail: jest.Mock;
    sendPasswordChangedNotification: jest.Mock;
  };
  let auditRecord: jest.Mock;
  let rateLimitStore: MemoryPwdResetRateLimitStore;
  let transactionFn: (
    cb: (manager: any) => Promise<unknown>,
  ) => Promise<unknown>;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'u@example.com',
    organizationId: 'org-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    password: 'old-hash',
  };

  beforeAll(() => {
    process.env.TOKEN_HASH_SECRET =
      '01234567890123456789012345678901'; // 32 chars
    process.env.REFRESH_TOKEN_PEPPER =
      '01234567890123456789012345678901';
  });

  afterAll(() => {
    process.env.TOKEN_HASH_SECRET = OLD_TOKEN_SECRET;
    process.env.REFRESH_TOKEN_PEPPER = OLD_PEPPER;
  });

  beforeEach(async () => {
    auditRecord = jest.fn().mockResolvedValue(undefined);
    emailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordChangedNotification: jest.fn().mockResolvedValue(undefined),
    };
    rateLimitStore = new MemoryPwdResetRateLimitStore();

    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    // Loose typing: partial Repository mocks don't satisfy TypeORM's full generic signatures.
    pwdResetRepo = {
      update: jest.fn().mockResolvedValue({ affected: 0 }),
      create: jest.fn((x) => x),
      save: jest.fn().mockImplementation((x) =>
        Promise.resolve({ ...x, id: 'pwd-reset-token-row-1' }),
      ),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
    } as any;

    refreshTokenRepo = {
      update: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    const qbUpdate = jest.fn().mockReturnThis();
    const qbWhere = jest.fn().mockReturnThis();
    const qbAndWhere = jest.fn().mockReturnThis();
    const qbExecute = jest.fn().mockResolvedValue({ affected: 2 });
    sessionRepo = {
      createQueryBuilder: jest.fn(() => ({
        update: qbUpdate,
        set: jest.fn().mockReturnThis(),
        where: qbWhere,
        andWhere: qbAndWhere,
        execute: qbExecute,
      })),
    } as any;

    // Must return the callback result — requestPasswordReset reads token id from the transaction.
    transactionFn = async (cb: (manager: any) => Promise<unknown>) => {
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === PasswordResetToken) return pwdResetRepo;
          if (entity === User) return userRepo;
          if (entity === AuthSession) return sessionRepo;
          throw new Error('unexpected entity');
        },
      };
      return await cb(manager);
    };

    const dataSource = {
      transaction: jest.fn((fn: any) => transactionFn(fn)),
    } as unknown as DataSource;

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Organization), useValue: {} },
        { provide: getRepositoryToken(UserOrganization), useValue: {} },
        { provide: getRepositoryToken(AuthSession), useValue: sessionRepo },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: pwdResetRepo,
        },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: getRepositoryToken(Workspace), useValue: {} },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
        { provide: DataSource, useValue: dataSource },
        { provide: EmailService, useValue: emailService },
        {
          provide: AUTH_RATE_LIMIT_STORE,
          useValue: rateLimitStore,
        },
        {
          provide: AuditService,
          useValue: { record: auditRecord },
        },
        {
          provide: OrgProvisioningService,
          useValue: {},
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('requestPasswordReset', () => {
    it('returns silently when email not found', async () => {
      userRepo.findOne = jest.fn().mockResolvedValue(null);
      await service.requestPasswordReset('missing@example.com');
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('stores hashed token and sends email', async () => {
      userRepo.findOne = jest.fn().mockResolvedValue(mockUser);
      await service.requestPasswordReset('u@example.com');

      expect(pwdResetRepo.save).toHaveBeenCalled();
      const saved = (pwdResetRepo.save as jest.Mock).mock.calls[0][0];
      expect(saved.tokenHash).toBeDefined();
      expect(saved.tokenHash).not.toEqual(expect.stringContaining('.')); // not raw base64url
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'u@example.com',
        expect.any(String),
      );
      const raw = emailService.sendPasswordResetEmail.mock.calls[0][1];
      expect(TokenHashUtil.hashToken(raw)).toBe(saved.tokenHash);
      expect(auditRecord).toHaveBeenCalled();
    });

    /**
     * Compensation path: transactional repo (`pwdResetRepo`) is what `save` uses inside
     * `dataSource.transaction`. `passwordResetTokenRepository.delete` is the injected repo used
     * after commit — same mock instance here so we assert `delete` on `pwdResetRepo`.
     */
    it('deletes token and returns neutral response when email send fails', async () => {
      userRepo.findOne = jest.fn().mockResolvedValue(mockUser);
      emailService.sendPasswordResetEmail.mockRejectedValueOnce(
        new Error('Failed to send email'),
      );

      await expect(
        service.requestPasswordReset('u@example.com'),
      ).resolves.toBeUndefined();

      expect(pwdResetRepo.delete).toHaveBeenCalledWith({
        id: 'pwd-reset-token-row-1',
      });
      expect(auditRecord).not.toHaveBeenCalled();
    });

    it('invalidates prior unconsumed tokens via update', async () => {
      userRepo.findOne = jest.fn().mockResolvedValue(mockUser);
      await service.requestPasswordReset('u@example.com');
      expect(pwdResetRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', consumed: false },
        expect.objectContaining({ consumed: true }),
      );
    });

    it('throws 429 after email rate limit exceeded', async () => {
      userRepo.findOne = jest.fn().mockResolvedValue(mockUser);
      await service.requestPasswordReset('u@example.com');
      await service.requestPasswordReset('u@example.com');
      await service.requestPasswordReset('u@example.com');
      await expect(service.requestPasswordReset('u@example.com')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('resetPasswordWithToken', () => {
    it('rejects weak password', async () => {
      await expect(
        service.resetPasswordWithToken('any', 'short'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid token hash', async () => {
      pwdResetRepo.findOne = jest.fn().mockResolvedValue(null);
      await expect(
        service.resetPasswordWithToken(
          TokenHashUtil.generateRawToken(),
          'newpass-word-ok',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects consumed token', async () => {
      const raw = TokenHashUtil.generateRawToken();
      const tokenHash = TokenHashUtil.hashToken(raw);
      pwdResetRepo.findOne = jest.fn().mockResolvedValue({
        tokenHash,
        consumed: true,
        user: mockUser,
        isExpired: () => false,
      });
      await expect(
        service.resetPasswordWithToken(raw, 'newpass-word-ok'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects expired token', async () => {
      const raw = TokenHashUtil.generateRawToken();
      const tokenHash = TokenHashUtil.hashToken(raw);
      pwdResetRepo.findOne = jest.fn().mockResolvedValue({
        tokenHash,
        consumed: false,
        user: mockUser,
        isExpired: () => true,
      });
      await expect(
        service.resetPasswordWithToken(raw, 'newpass-word-ok'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates password, consumes token, revokes sessions', async () => {
      const raw = TokenHashUtil.generateRawToken();
      const tokenHash = TokenHashUtil.hashToken(raw);
      const row: any = {
        tokenHash,
        consumed: false,
        user: { ...mockUser },
        isExpired: () => false,
      };
      pwdResetRepo.findOne = jest.fn().mockResolvedValue(row);

      await service.resetPasswordWithToken(raw, 'newpass-word-ok');

      expect(row.consumed).toBe(true);
      expect(row.consumedAt).toBeInstanceOf(Date);
      expect(userRepo.save).toHaveBeenCalled();
      const savedUser = (userRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedUser.password).not.toBe('old-hash');
      expect(sessionRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('revokes legacy refresh_tokens rows for the user during password reset', async () => {
      const raw = TokenHashUtil.generateRawToken();
      const tokenHash = TokenHashUtil.hashToken(raw);
      const row: any = {
        tokenHash,
        consumed: false,
        user: { ...mockUser },
        isExpired: () => false,
      };
      pwdResetRepo.findOne = jest.fn().mockResolvedValue(row);

      await service.resetPasswordWithToken(raw, 'newpass-word-ok');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { user_id: 'user-1', revoked: false },
        { revoked: true },
      );
    });

    it('does not fail password reset if legacy refresh_tokens update throws', async () => {
      refreshTokenRepo.update = jest
        .fn()
        .mockRejectedValue(new Error('relation "refresh_tokens" does not exist'));

      const raw = TokenHashUtil.generateRawToken();
      const tokenHash = TokenHashUtil.hashToken(raw);
      const row: any = {
        tokenHash,
        consumed: false,
        user: { ...mockUser },
        isExpired: () => false,
      };
      pwdResetRepo.findOne = jest.fn().mockResolvedValue(row);

      await expect(
        service.resetPasswordWithToken(raw, 'newpass-word-ok'),
      ).resolves.toBeUndefined();

      expect(userRepo.save).toHaveBeenCalled();
    });

    it('sends password changed notification email after successful reset', async () => {
      const raw = TokenHashUtil.generateRawToken();
      const tokenHash = TokenHashUtil.hashToken(raw);
      const row: any = {
        tokenHash,
        consumed: false,
        user: { ...mockUser },
        isExpired: () => false,
      };
      pwdResetRepo.findOne = jest.fn().mockResolvedValue(row);

      await service.resetPasswordWithToken(raw, 'newpass-word-ok');

      expect(emailService.sendPasswordChangedNotification).toHaveBeenCalledWith(
        'u@example.com',
        'Ada Lovelace',
      );
    });

    it('does not fail password reset if notification email fails', async () => {
      emailService.sendPasswordChangedNotification = jest
        .fn()
        .mockRejectedValue(new Error('SendGrid unavailable'));

      const raw = TokenHashUtil.generateRawToken();
      const tokenHash = TokenHashUtil.hashToken(raw);
      const row: any = {
        tokenHash,
        consumed: false,
        user: { ...mockUser },
        isExpired: () => false,
      };
      pwdResetRepo.findOne = jest.fn().mockResolvedValue(row);

      await expect(
        service.resetPasswordWithToken(raw, 'newpass-word-ok'),
      ).resolves.toBeUndefined();

      expect(emailService.sendPasswordChangedNotification).toHaveBeenCalled();
    });
  });
});
