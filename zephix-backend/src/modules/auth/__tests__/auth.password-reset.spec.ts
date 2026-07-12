import {
  BadRequestException,
  HttpException,
  HttpStatus,
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
import { AppException } from '../../../shared/errors/app-exception';
import { ErrorCode } from '../../../shared/errors/error-codes';
import * as bcrypt from 'bcrypt';

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
    isSendGridConfigured: jest.Mock;
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
      isSendGridConfigured: jest.fn().mockReturnValue(true),
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

    it('throws SERVICE_UNAVAILABLE when SendGrid is not configured', async () => {
      emailService.isSendGridConfigured.mockReturnValue(false);
      userRepo.findOne = jest.fn().mockResolvedValue(mockUser);
      try {
        await service.requestPasswordReset('u@example.com');
        throw new Error('expected requestPasswordReset to throw');
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(AppException);
        const ex = e as AppException;
        expect(ex.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect((ex.getResponse() as { code: string }).code).toBe(
          ErrorCode.SERVICE_UNAVAILABLE,
        );
      }
      expect(pwdResetRepo.save).not.toHaveBeenCalled();
      emailService.isSendGridConfigured.mockReturnValue(true);
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

  describe('changeUserPassword', () => {
    it('revokes auth sessions and legacy refresh tokens after successful change', async () => {
      const hash = await bcrypt.hash('OldSecret1!', 10);
      userRepo.findOne = jest.fn().mockResolvedValue({
        ...mockUser,
        password: hash,
      });
      userRepo.save = jest.fn().mockImplementation((u: User) => Promise.resolve(u));

      await service.changeUserPassword('user-1', {
        currentPassword: 'OldSecret1!',
        newPassword: 'NewSecret1!',
      });

      expect(sessionRepo.createQueryBuilder).toHaveBeenCalled();
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { user_id: 'user-1', revoked: false },
        { revoked: true },
      );
    });
  });

  describe('adminGenerateResetLink (AUTH-1)', () => {
    const actor = { userId: 'admin-1', organizationId: 'org-1' };

    it('generates a reset link + stores a hashed 1h token, and audits it', async () => {
      userRepo.findOne = jest.fn().mockResolvedValue(mockUser);

      const before = Date.now();
      const result = await service.adminGenerateResetLink('user-1', actor);

      // Link points at the reset page and carries a raw token.
      expect(result.resetLink).toContain('/reset-password?token=');
      expect(result.userId).toBe('user-1');
      const rawToken = result.resetLink.split('token=')[1];
      expect(rawToken.length).toBeGreaterThan(10);

      // Prior tokens invalidated, new token persisted with the HASH (not raw).
      expect(pwdResetRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', consumed: false },
        expect.objectContaining({ consumed: true }),
      );
      const saved = (pwdResetRepo.save as jest.Mock).mock.calls[0][0];
      expect(saved.tokenHash).toBe(TokenHashUtil.hashToken(rawToken));
      expect(saved.tokenHash).not.toBe(rawToken);
      expect(saved.consumed).toBe(false);

      // ~1 hour expiry.
      const ms = new Date(result.expiresAt).getTime() - before;
      expect(ms).toBeGreaterThan(59 * 60 * 1000);
      expect(ms).toBeLessThan(61 * 60 * 1000);

      // Audited as an admin-initiated action.
      expect(auditRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'password_reset_link_generated',
          actorUserId: 'admin-1',
          entityId: 'user-1',
        }),
      );
    });

    it('does NOT depend on SendGrid (works while email is dormant)', async () => {
      userRepo.findOne = jest.fn().mockResolvedValue(mockUser);
      emailService.isSendGridConfigured.mockReturnValue(false);

      const result = await service.adminGenerateResetLink('user-1', actor);

      expect(result.resetLink).toContain('/reset-password?token=');
      expect(emailService.isSendGridConfigured).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('throws NotFound when the target user does not exist', async () => {
      userRepo.findOne = jest.fn().mockResolvedValue(null);
      await expect(
        service.adminGenerateResetLink('missing', actor),
      ).rejects.toMatchObject({ status: 404 });
      expect(pwdResetRepo.save).not.toHaveBeenCalled();
    });

    it('refuses to reset a user outside the admin org (403), minting no token', async () => {
      userRepo.findOne = jest
        .fn()
        .mockResolvedValue({ ...mockUser, organizationId: 'other-org' });
      await expect(
        service.adminGenerateResetLink('user-1', actor),
      ).rejects.toMatchObject({ status: 403 });
      expect(pwdResetRepo.save).not.toHaveBeenCalled();
    });

    // SECURITY INVARIANT 1: the returned link is a bearer credential — the raw
    // token must never appear in a log line or in audit metadata. The audit row
    // records only the event + actor + target.
    it('never leaks the raw token into audit metadata (records event/actor/target only)', async () => {
      userRepo.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await service.adminGenerateResetLink('user-1', actor);
      const rawToken = result.resetLink.split('token=')[1];

      const auditPayload = JSON.stringify(auditRecord.mock.calls);
      expect(auditPayload).not.toContain(rawToken);
      // The audit `after` blob is empty — no token, no hash.
      const auditArg = auditRecord.mock.calls[0][0];
      expect(auditArg.after).toEqual({});
      expect(JSON.stringify(auditArg)).not.toContain(rawToken);
      // Defense-in-depth: the hash must not be audited either.
      expect(auditPayload).not.toContain(TokenHashUtil.hashToken(rawToken));
    });

    // SECURITY INVARIANT 2: single-use by design — generating a new link
    // consumes any outstanding tokens, so the FIRST link is dead once a second
    // is generated. (End-to-end "first link rejected" is proven live in Stage 2.)
    it('consumes prior tokens on each generation — generate twice, first is invalidated', async () => {
      userRepo.findOne = jest.fn().mockResolvedValue(mockUser);

      const first = await service.adminGenerateResetLink('user-1', actor);
      const second = await service.adminGenerateResetLink('user-1', actor);

      // Two distinct tokens.
      const t1 = first.resetLink.split('token=')[1];
      const t2 = second.resetLink.split('token=')[1];
      expect(t1).not.toBe(t2);

      // Every generation invalidates outstanding (unconsumed) tokens first,
      // so the previously-issued link can no longer be redeemed.
      expect(pwdResetRepo.update).toHaveBeenCalledTimes(2);
      expect(pwdResetRepo.update).toHaveBeenNthCalledWith(
        2,
        { userId: 'user-1', consumed: false },
        expect.objectContaining({ consumed: true }),
      );
    });
  });
});
