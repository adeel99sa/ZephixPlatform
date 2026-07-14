import * as crypto from 'crypto';

// Mock TokenHashUtil before any imports that load it (jest.mock is hoisted)
// This avoids needing real REFRESH_TOKEN_PEPPER / TOKEN_HASH_SECRET env vars
jest.mock('../../common/security/token-hash.util', () => {
  const deterministicHash = (input: string): string =>
    require('crypto').createHash('sha256').update(input).digest('hex');
  return {
    TokenHashUtil: {
      hashRefreshToken: jest.fn((token: string) => deterministicHash(`refresh:${token}`)),
      verifyRefreshToken: jest.fn(
        (token: string, hash: string) => deterministicHash(`refresh:${token}`) === hash,
      ),
      hashToken: jest.fn((token: string) => deterministicHash(`token:${token}`)),
      generateRawToken: jest.fn(() => 'mock-raw-token'),
    },
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthSession } from './entities/auth-session.entity';
import { User } from '../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
// EX-1: AuthService grew these injections; the spec must provide them.
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuditService } from '../audit/services/audit.service';
import { AUTH_RATE_LIMIT_STORE } from './tokens';
import { OrgProvisioningService } from './services/org-provisioning.service';
import { EmailService } from '../../shared/services/email.service';
import { IDENTITY_EVENT_BUS } from '../../common/events/identity-event-bus';
import { TokenHashUtil } from '../../common/security/token-hash.util';

describe('AuthService - Refresh Token Security', () => {
  let service: AuthService;
  let authSessionRepo: Repository<AuthSession>;
  let userRepo: Repository<User>;
  let jwtService: JwtService;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    organizationId: 'org-1',
    role: 'admin',
    isActive: true,
  };

  const mockSession: Partial<AuthSession> = {
    id: 'session-1',
    userId: 'user-1',
    organizationId: 'org-1',
    currentRefreshTokenHash: 'hash-123',
    refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    // EX-1: ADR-002 fields — a fresh (not-yet-rotated) session has replacedAt null.
    replacedAt: null,
    familyId: 'family-1',
    lastSeenAt: new Date(),
    isRevoked: () => false,
    isExpired: () => false,
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = `unit_jwt_${crypto.randomBytes(24).toString('hex')}`;
    process.env.JWT_REFRESH_SECRET = `unit_refresh_${crypto.randomBytes(24).toString('hex')}`;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserOrganization),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuthSession),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(), // EX-1: ADR-002 rotation updates the new session's hash
          },
        },
        {
          provide: getRepositoryToken(Workspace),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            // EX-1: ADR-002 new-row rotation runs inside a transaction; the mock
            // must execute the callback and return the created session.
            transaction: jest.fn(async (cb: any) =>
              cb({
                getRepository: () => ({
                  create: (o: any) => ({ ...o, id: 'new-session-1' }),
                  save: async (o: any) => ({ ...o, id: o.id ?? 'new-session-1' }),
                  update: jest.fn(),
                }),
              }),
            ),
          },
        },
        // EX-1: newly-required AuthService dependencies (harness only).
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn() },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: { findOne: jest.fn(), save: jest.fn(), create: jest.fn() },
        },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        { provide: AUTH_RATE_LIMIT_STORE, useValue: null },
        { provide: AuditService, useValue: { record: jest.fn() } },
        { provide: OrgProvisioningService, useValue: { provisionNewOrganization: jest.fn() } },
        { provide: IDENTITY_EVENT_BUS, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authSessionRepo = module.get<Repository<AuthSession>>(
      getRepositoryToken(AuthSession),
    );
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('Refresh fails after session revoke', () => {
    it('should reject refresh token after session is revoked', async () => {
      const revokedSession = {
        ...mockSession,
        revokedAt: new Date(),
        isRevoked: () => true,
      };

      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 'user-1',
        sid: 'session-1',
      });
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (authSessionRepo.findOne as jest.Mock).mockResolvedValue(revokedSession);

      await expect(
        service.refreshToken('refresh-token', null, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Refresh rotates token and old token fails', () => {
    it('should rotate refresh token and reject old token', async () => {
      const oldRefreshToken = 'old-refresh-token';
      const newRefreshToken = 'new-refresh-token';
      const oldHash = TokenHashUtil.hashRefreshToken(oldRefreshToken);
      const newHash = TokenHashUtil.hashRefreshToken(newRefreshToken);

      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 'user-1',
        sid: 'session-1',
      });
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (authSessionRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockSession,
        currentRefreshTokenHash: oldHash,
      });
      // AuthService calls generateRefreshToken FIRST, then generateToken
      (jwtService.sign as jest.Mock).mockReturnValueOnce(newRefreshToken); // refresh token
      (jwtService.sign as jest.Mock).mockReturnValueOnce('access-token');  // access token
      (authSessionRepo.save as jest.Mock).mockResolvedValue({
        ...mockSession,
        currentRefreshTokenHash: newHash,
      });

      // First refresh succeeds
      const result = await service.refreshToken(
        oldRefreshToken,
        null,
        '127.0.0.1',
        'test-agent',
      );

      expect(result.refreshToken).toBe(newRefreshToken);

      // Old token should fail on next refresh
      (authSessionRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockSession,
        currentRefreshTokenHash: newHash, // Updated hash
      });

      await expect(
        service.refreshToken(oldRefreshToken, null, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
