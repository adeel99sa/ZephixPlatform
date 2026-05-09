// Mock bcrypt at module level so we can control compare() and observe its calls.
// hashSync is preserved (real) for any other test in the suite that needs it.
jest.mock('bcrypt', () => {
  const real = jest.requireActual('bcrypt');
  return { ...real, compare: jest.fn() };
});

import {
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MfaController } from './mfa.controller';
import { MfaService } from '../services/mfa.service';
import { User } from '../../users/entities/user.entity';
import { AuthRequest } from '../../../common/http/auth-request';

/**
 * MfaController unit tests.
 *
 * MfaService logic (TOTP enrollment / verify / disable round-trips with
 * encrypted secret persistence) is covered by mfa.service.spec.ts in PR1.
 * This spec only asserts that the controller wires the right userId from
 * the auth context to the service and gates DELETE behind a password
 * re-confirm.
 */
describe('MfaController', () => {
  let controller: MfaController;
  let mfaService: jest.Mocked<
    Pick<MfaService, 'enroll' | 'verify' | 'disable'>
  >;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'findOne'>>;

  const USER_ID = '00000000-0000-0000-0000-000000000777';

  const buildReq = (overrides: Partial<{ id: string }> = {}): AuthRequest =>
    ({
      user: { id: overrides.id ?? USER_ID, organizationId: 'org-1', email: 'u@test.local' },
    }) as unknown as AuthRequest;

  beforeEach(() => {
    mfaService = {
      enroll: jest.fn(),
      verify: jest.fn(),
      disable: jest.fn(),
    };
    userRepo = { findOne: jest.fn() };
    controller = new MfaController(
      mfaService as unknown as MfaService,
      userRepo as unknown as Repository<User>,
    );
  });

  describe('POST /auth/mfa/enroll', () => {
    it('delegates to mfaService.enroll(userId) and returns the QR payload', async () => {
      const expected = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeDataUrl: 'data:image/png;base64,abc',
        manualEntryKey: 'JBSWY3DPEHPK3PXP',
      };
      mfaService.enroll.mockResolvedValue(expected);

      const result = await controller.enroll(buildReq());

      expect(mfaService.enroll).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(expected);
    });

    it('propagates NotFoundException from the service', async () => {
      mfaService.enroll.mockRejectedValue(new NotFoundException('User not found'));
      await expect(controller.enroll(buildReq())).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /auth/mfa/verify', () => {
    it('delegates to mfaService.verify(userId, code) and returns enabled flag', async () => {
      mfaService.verify.mockResolvedValue({ mfaEnabled: true });

      const result = await controller.verify(buildReq(), { code: '123456' });

      expect(mfaService.verify).toHaveBeenCalledWith(USER_ID, '123456');
      expect(result).toEqual({ mfaEnabled: true });
    });
  });

  describe('DELETE /auth/mfa', () => {
    const compareMock = bcrypt.compare as unknown as jest.Mock;

    beforeEach(() => {
      compareMock.mockReset();
    });

    it('throws INVALID_PASSWORD when current password does not match', async () => {
      userRepo.findOne.mockResolvedValue({
        id: USER_ID,
        password: '$2b$10$realhash',
      } as User);
      compareMock.mockResolvedValue(false);

      let caught: unknown;
      try {
        await controller.disable(buildReq(), { currentPassword: 'wrong' });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(UnauthorizedException);
      const response = (caught as UnauthorizedException).getResponse() as {
        code: string;
      };
      expect(response.code).toBe('INVALID_PASSWORD');
      expect(mfaService.disable).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user lookup misses (defensive)', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        controller.disable(buildReq(), { currentPassword: 'whatever' }),
      ).rejects.toThrow(NotFoundException);
      expect(mfaService.disable).not.toHaveBeenCalled();
    });

    it('delegates to mfaService.disable(userId) when password matches', async () => {
      userRepo.findOne.mockResolvedValue({
        id: USER_ID,
        password: '$2b$10$realhash',
      } as User);
      compareMock.mockResolvedValue(true);
      mfaService.disable.mockResolvedValue({ mfaEnabled: false });

      const result = await controller.disable(buildReq(), {
        currentPassword: 'correct',
      });

      expect(compareMock).toHaveBeenCalledWith('correct', '$2b$10$realhash');
      expect(mfaService.disable).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual({ mfaEnabled: false });
    });
  });
});
