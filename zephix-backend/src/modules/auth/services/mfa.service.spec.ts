import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { MfaService } from './mfa.service';
import { MfaSecretCipherService } from '../../../common/security/mfa-secret-cipher.service';
import { User } from '../../users/entities/user.entity';

/**
 * Unit tests for MfaService — uses a real cipher service (not mocked) so the
 * encrypt/decrypt roundtrip is exercised end-to-end. The User repository is
 * stubbed in-memory.
 */
describe('MfaService', () => {
  let service: MfaService;
  let cipher: MfaSecretCipherService;
  let repo: InMemoryUserRepository;
  const originalKey = process.env.MFA_SECRET_KEY;

  beforeEach(() => {
    process.env.MFA_SECRET_KEY = crypto.randomBytes(32).toString('base64');
    cipher = new MfaSecretCipherService();
    repo = new InMemoryUserRepository();
    service = new MfaService(repo as unknown as Repository<User>, cipher);
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.MFA_SECRET_KEY;
    } else {
      process.env.MFA_SECRET_KEY = originalKey;
    }
  });

  describe('enroll()', () => {
    it('generates a fresh TOTP secret, encrypts it, and returns QR + manual key', async () => {
      const user = repo.seedUser({ mfaEnabled: false });

      const result = await service.enroll(user.id);

      expect(result.secret).toMatch(/^[A-Z2-7]+$/); // base32
      expect(result.manualEntryKey).toBe(result.secret);
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

      const updated = await repo.findOneById(user.id);
      expect(updated?.mfaSecretCiphertext).toBeInstanceOf(Buffer);
      expect(updated?.mfaSecretIv).toBeInstanceOf(Buffer);
      expect(updated?.mfaSecretAuthTag).toBeInstanceOf(Buffer);
      // Critical: enrollment alone does NOT enable MFA — must verify first
      expect(updated?.mfaEnabled).toBe(false);

      // Round-trip: decrypting stored ciphertext yields the secret we returned
      const decrypted = cipher.decrypt({
        ciphertext: updated!.mfaSecretCiphertext!,
        iv: updated!.mfaSecretIv!,
        authTag: updated!.mfaSecretAuthTag!,
      });
      expect(decrypted).toBe(result.secret);
    });

    it('overwrites a prior unverified secret on re-enrollment', async () => {
      const user = repo.seedUser({ mfaEnabled: false });

      const first = await service.enroll(user.id);
      const second = await service.enroll(user.id);

      expect(second.secret).not.toBe(first.secret);
      const updated = await repo.findOneById(user.id);
      const decrypted = cipher.decrypt({
        ciphertext: updated!.mfaSecretCiphertext!,
        iv: updated!.mfaSecretIv!,
        authTag: updated!.mfaSecretAuthTag!,
      });
      expect(decrypted).toBe(second.secret);
    });

    it('throws ConflictException when MFA is already enabled', async () => {
      const user = repo.seedUser({ mfaEnabled: true });
      await expect(service.enroll(user.id)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for unknown user', async () => {
      await expect(service.enroll('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('verify()', () => {
    it('flips mfaEnabled = true when the TOTP code matches', async () => {
      const user = repo.seedUser({ mfaEnabled: false });
      const enrollment = await service.enroll(user.id);
      const validCode = authenticator.generate(enrollment.secret);

      const result = await service.verify(user.id, validCode);

      expect(result.mfaEnabled).toBe(true);
      const updated = await repo.findOneById(user.id);
      expect(updated?.mfaEnabled).toBe(true);
    });

    it('throws BadRequestException for code in wrong format', async () => {
      const user = repo.seedUser({ mfaEnabled: false });
      await service.enroll(user.id);

      await expect(service.verify(user.id, 'ABCDEF')).rejects.toThrow(/format/);
      await expect(service.verify(user.id, '12345')).rejects.toThrow(/format/); // 5 digits
      await expect(service.verify(user.id, '1234567')).rejects.toThrow(/format/); // 7 digits
    });

    it('throws BadRequestException with MFA_NOT_ENROLLED when no secret on file', async () => {
      const user = repo.seedUser({ mfaEnabled: false });
      // Skip enroll — no secret stored
      await expect(service.verify(user.id, '123456')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MFA_NOT_ENROLLED' }),
      });
    });

    it('throws BadRequestException for incorrect TOTP code', async () => {
      const user = repo.seedUser({ mfaEnabled: false });
      await service.enroll(user.id);

      await expect(service.verify(user.id, '000000')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MFA_INVALID_CODE' }),
      });
      // mfaEnabled stays false after failed verify
      const updated = await repo.findOneById(user.id);
      expect(updated?.mfaEnabled).toBe(false);
    });
  });

  describe('verifyForLogin()', () => {
    it('returns silently for valid code on enrolled user', async () => {
      const user = repo.seedUser({ mfaEnabled: false });
      const enrollment = await service.enroll(user.id);
      await service.verify(user.id, authenticator.generate(enrollment.secret));

      const validCode = authenticator.generate(enrollment.secret);
      await expect(service.verifyForLogin(user.id, validCode)).resolves.toBeUndefined();
    });

    it('throws UnauthorizedException for invalid code', async () => {
      const user = repo.seedUser({ mfaEnabled: false });
      const enrollment = await service.enroll(user.id);
      await service.verify(user.id, authenticator.generate(enrollment.secret));

      await expect(service.verifyForLogin(user.id, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user has not enabled MFA', async () => {
      const user = repo.seedUser({ mfaEnabled: false });

      await expect(service.verifyForLogin(user.id, '123456')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MFA_NOT_ENROLLED' }),
      });
    });

    it('throws UnauthorizedException for malformed code (no enumeration)', async () => {
      const user = repo.seedUser({ mfaEnabled: true });
      await expect(service.verifyForLogin(user.id, 'NOPE')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('disable()', () => {
    it('clears MFA fields and sets mfaEnabled = false', async () => {
      const user = repo.seedUser({ mfaEnabled: false });
      const enrollment = await service.enroll(user.id);
      await service.verify(user.id, authenticator.generate(enrollment.secret));

      const result = await service.disable(user.id);

      expect(result.mfaEnabled).toBe(false);
      const updated = await repo.findOneById(user.id);
      expect(updated?.mfaEnabled).toBe(false);
      expect(updated?.mfaSecretCiphertext).toBeNull();
      expect(updated?.mfaSecretIv).toBeNull();
      expect(updated?.mfaSecretAuthTag).toBeNull();
    });

    it('throws BadRequestException when MFA is not enabled', async () => {
      const user = repo.seedUser({ mfaEnabled: false });
      await expect(service.disable(user.id)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MFA_NOT_ENROLLED' }),
      });
    });
  });

  describe('isAdminBlockedByMfaPolicy()', () => {
    const fixedNow = new Date('2026-06-01T12:00:00Z');

    it('returns false when user has MFA enabled (regardless of grace)', () => {
      expect(
        service.isAdminBlockedByMfaPolicy(
          { mfaEnabled: true, mfaGraceUntil: null },
          fixedNow,
        ),
      ).toBe(false);
      expect(
        service.isAdminBlockedByMfaPolicy(
          { mfaEnabled: true, mfaGraceUntil: new Date('2020-01-01T00:00:00Z') },
          fixedNow,
        ),
      ).toBe(false);
    });

    it('returns false when grace period has not been stamped yet', () => {
      expect(
        service.isAdminBlockedByMfaPolicy(
          { mfaEnabled: false, mfaGraceUntil: null },
          fixedNow,
        ),
      ).toBe(false);
    });

    it('returns false during the grace window', () => {
      expect(
        service.isAdminBlockedByMfaPolicy(
          { mfaEnabled: false, mfaGraceUntil: new Date('2026-06-05T00:00:00Z') },
          fixedNow,
        ),
      ).toBe(false);
    });

    it('returns true after grace expiry', () => {
      expect(
        service.isAdminBlockedByMfaPolicy(
          { mfaEnabled: false, mfaGraceUntil: new Date('2026-05-01T00:00:00Z') },
          fixedNow,
        ),
      ).toBe(true);
    });
  });
});

// ─── Test helpers ────────────────────────────────────────────────────────

/**
 * Minimal in-memory User repository — implements only the methods MfaService
 * actually invokes (findOne, update). Avoids pulling in a full TypeORM test
 * harness for what's logically a pure unit test.
 */
class InMemoryUserRepository {
  private users: User[] = [];
  private nextId = 1;

  seedUser(overrides: Partial<User> = {}): User {
    const id = `00000000-0000-0000-0000-${String(this.nextId++).padStart(12, '0')}`;
    const user = {
      id,
      email: `user${this.nextId}@test.local`,
      mfaEnabled: false,
      mfaSecretCiphertext: null,
      mfaSecretIv: null,
      mfaSecretAuthTag: null,
      mfaGraceUntil: null,
      ...overrides,
    } as unknown as User;
    this.users.push(user);
    return user;
  }

  async findOne({ where }: { where: { id: string } }): Promise<User | null> {
    return this.users.find((u) => u.id === where.id) ?? null;
  }

  async findOneById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async update(id: string, patch: Partial<User>): Promise<{ affected: number }> {
    const u = this.users.find((u) => u.id === id);
    if (!u) {
      return { affected: 0 };
    }
    Object.assign(u, patch);
    return { affected: 1 };
  }
}
