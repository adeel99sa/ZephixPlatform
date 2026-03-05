import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SmokeInvitesController } from './smoke-invites.controller';
import { SmokeKeyGuard } from '../guards/smoke-key.guard';
import { AuthOutbox } from '../entities/auth-outbox.entity';

// Minimal fake query builder that mirrors the chained API used in the controller
function makeQueryBuilder(rawResult: { token: string } | null) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(rawResult),
  };
  return qb;
}

describe('SmokeInvitesController', () => {
  let controller: SmokeInvitesController;
  let mockCreateQueryBuilder: jest.Mock;

  const originalNodeEnv = process.env.NODE_ENV;
  const originalZephixEnv = process.env.ZEPHIX_ENV;
  const originalSmokeKey = process.env.STAGING_SMOKE_KEY;

  beforeEach(async () => {
    // Set staging runtime so SmokeKeyGuard passes
    process.env.NODE_ENV = 'staging';
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SMOKE_KEY = 'test-smoke-key';

    mockCreateQueryBuilder = jest.fn().mockReturnValue(makeQueryBuilder(null));

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmokeInvitesController],
      providers: [
        {
          provide: getRepositoryToken(AuthOutbox),
          useValue: {
            createQueryBuilder: mockCreateQueryBuilder,
          },
        },
        SmokeKeyGuard,
      ],
    }).compile();

    controller = module.get<SmokeInvitesController>(SmokeInvitesController);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ZEPHIX_ENV = originalZephixEnv;
    process.env.STAGING_SMOKE_KEY = originalSmokeKey;
    jest.clearAllMocks();
  });

  describe('SmokeKeyGuard behavior', () => {
    it('guard rejects when smoke key missing', () => {
      const guard = new SmokeKeyGuard();
      process.env.NODE_ENV = 'staging';
      process.env.ZEPHIX_ENV = 'staging';
      process.env.STAGING_SMOKE_KEY = 'test-smoke-key';

      const ctx: any = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
        }),
      };
      expect(() => guard.canActivate(ctx)).toThrow();
    });

    it('guard rejects when smoke key is wrong', () => {
      const guard = new SmokeKeyGuard();
      process.env.NODE_ENV = 'staging';
      process.env.ZEPHIX_ENV = 'staging';
      process.env.STAGING_SMOKE_KEY = 'test-smoke-key';

      const ctx: any = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: { 'x-smoke-key': 'bad-key' } }),
        }),
      };
      expect(() => guard.canActivate(ctx)).toThrow();
    });

    it('guard rejects in non-staging runtime', () => {
      const guard = new SmokeKeyGuard();
      process.env.NODE_ENV = 'production';
      process.env.ZEPHIX_ENV = 'production';
      process.env.STAGING_SMOKE_KEY = 'test-smoke-key';

      const ctx: any = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: { 'x-smoke-key': 'test-smoke-key' } }),
        }),
      };
      expect(() => guard.canActivate(ctx)).toThrow();
    });
  });

  describe('getLatestToken', () => {
    it('throws 400 when email is missing', async () => {
      await expect(controller.getLatestToken(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws 400 when email is empty string', async () => {
      await expect(controller.getLatestToken('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws 400 when email is not @zephix.dev domain', async () => {
      await expect(
        controller.getLatestToken('attacker@evil.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws 400 for non-zephix.dev subdomain trick', async () => {
      await expect(
        controller.getLatestToken('test@evil.zephix.dev.attacker.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws 404 when no outbox entry found', async () => {
      mockCreateQueryBuilder.mockReturnValue(makeQueryBuilder(null));

      await expect(
        controller.getLatestToken('smoke+invitee@zephix.dev'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns { token } only when outbox entry exists', async () => {
      const fakeToken = 'fake-raw-invite-token-abc123';
      mockCreateQueryBuilder.mockReturnValue(
        makeQueryBuilder({ token: fakeToken }),
      );

      const result = await controller.getLatestToken('smoke+invitee@zephix.dev');

      expect(result).toEqual({ token: fakeToken });
      // Must NOT include any other fields
      expect(Object.keys(result)).toEqual(['token']);
    });

    it('normalizes email to lowercase before query', async () => {
      const fakeToken = 'token-xyz';
      const qb = makeQueryBuilder({ token: fakeToken });
      mockCreateQueryBuilder.mockReturnValue(qb);

      await controller.getLatestToken('SMOKE+Invitee@ZEPHIX.DEV');

      // Verify andWhere was called with lowercase email
      const andWhereCalls = qb.andWhere.mock.calls;
      const emailCall = andWhereCalls.find(
        (c: any[]) => typeof c[1] === 'object' && 'email' in c[1],
      );
      expect(emailCall).toBeDefined();
      expect(emailCall[1].email).toBe('smoke+invitee@zephix.dev');
    });
  });
});
