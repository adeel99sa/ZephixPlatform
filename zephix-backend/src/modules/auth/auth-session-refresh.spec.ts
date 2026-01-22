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
    lastSeenAt: new Date(),
    isRevoked: () => false,
    isExpired: () => false,
  };

  beforeEach(async () => {
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
            transaction: jest.fn(),
          },
        },
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
      (jwtService.sign as jest.Mock).mockReturnValueOnce('access-token');
      (jwtService.sign as jest.Mock).mockReturnValueOnce(newRefreshToken);
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
