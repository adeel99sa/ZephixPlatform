import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SmokeInvitesController } from './smoke-invites.controller';
import { SmokeKeyGuard } from '../guards/smoke-key.guard';
import { AuthOutbox } from '../entities/auth-outbox.entity';

describe('SmokeInvitesController', () => {
  let controller: SmokeInvitesController;
  let mockManagerQuery: jest.Mock;

  const originalNodeEnv = process.env.NODE_ENV;
  const originalZephixEnv = process.env.ZEPHIX_ENV;
  const originalSmokeKey = process.env.STAGING_SMOKE_KEY;

  beforeEach(async () => {
    process.env.NODE_ENV = 'staging';
    process.env.ZEPHIX_ENV = 'staging';
    process.env.STAGING_SMOKE_KEY = 'test-smoke-key';

    mockManagerQuery = jest.fn().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmokeInvitesController],
      providers: [
        {
          provide: getRepositoryToken(AuthOutbox),
          useValue: {
            manager: { query: mockManagerQuery },
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
      mockManagerQuery.mockResolvedValue([]);

      await expect(
        controller.getLatestToken('smoke+invitee@zephix.dev'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns { token } only when outbox entry exists', async () => {
      const fakeToken = 'fake-raw-invite-token-abc123';
      mockManagerQuery.mockResolvedValue([{ token: fakeToken }]);

      const result = await controller.getLatestToken('smoke+invitee@zephix.dev');

      expect(result).toEqual({ token: fakeToken });
      // Must NOT include any other fields
      expect(Object.keys(result)).toEqual(['token']);
    });

    it('normalizes email to lowercase before querying', async () => {
      const fakeToken = 'token-xyz';
      mockManagerQuery.mockResolvedValue([{ token: fakeToken }]);

      await controller.getLatestToken('SMOKE+Invitee@ZEPHIX.DEV');

      expect(mockManagerQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['smoke+invitee@zephix.dev']),
      );
    });
  });
});
