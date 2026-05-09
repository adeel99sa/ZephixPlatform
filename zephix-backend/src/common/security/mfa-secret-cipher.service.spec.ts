import * as crypto from 'crypto';
import {
  EncryptedMfaSecret,
  MfaSecretCipherService,
} from './mfa-secret-cipher.service';

describe('MfaSecretCipherService', () => {
  let service: MfaSecretCipherService;
  const originalEnv = process.env.MFA_SECRET_KEY;

  beforeEach(() => {
    service = new MfaSecretCipherService();
    // 32 random bytes, base64-encoded — matches expected runtime format
    process.env.MFA_SECRET_KEY = crypto.randomBytes(32).toString('base64');
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.MFA_SECRET_KEY;
    } else {
      process.env.MFA_SECRET_KEY = originalEnv;
    }
  });

  describe('round-trip', () => {
    it('encrypts and decrypts a typical TOTP base32 secret', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP'; // canonical RFC 4648 example secret
      const payload = service.encrypt(plaintext);
      expect(service.decrypt(payload)).toBe(plaintext);
    });

    it('encrypts and decrypts arbitrary UTF-8', () => {
      const plaintext = 'multi-byte UTF-8: 日本語 — émoji 🔐';
      const payload = service.encrypt(plaintext);
      expect(service.decrypt(payload)).toBe(plaintext);
    });

    it('produces different ciphertexts for same plaintext (per-call IV)', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const a = service.encrypt(plaintext);
      const b = service.encrypt(plaintext);
      expect(a.iv.equals(b.iv)).toBe(false);
      expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
      expect(service.decrypt(a)).toBe(plaintext);
      expect(service.decrypt(b)).toBe(plaintext);
    });

    it('produces 12-byte IV and 16-byte auth tag', () => {
      const payload = service.encrypt('JBSWY3DPEHPK3PXP');
      expect(payload.iv.length).toBe(12);
      expect(payload.authTag.length).toBe(16);
    });
  });

  describe('tamper detection', () => {
    let plaintext: string;
    let payload: EncryptedMfaSecret;

    beforeEach(() => {
      plaintext = 'JBSWY3DPEHPK3PXP';
      payload = service.encrypt(plaintext);
    });

    it('throws when ciphertext is modified', () => {
      const tampered: EncryptedMfaSecret = {
        ciphertext: Buffer.from(payload.ciphertext),
        iv: payload.iv,
        authTag: payload.authTag,
      };
      // Flip one bit in the ciphertext
      tampered.ciphertext[0] ^= 0x01;
      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('throws when auth tag is modified', () => {
      const tampered: EncryptedMfaSecret = {
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        authTag: Buffer.from(payload.authTag),
      };
      tampered.authTag[0] ^= 0x01;
      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('throws when IV is replaced with another valid-looking IV', () => {
      const tampered: EncryptedMfaSecret = {
        ciphertext: payload.ciphertext,
        iv: crypto.randomBytes(12),
        authTag: payload.authTag,
      };
      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('throws when wrong master key is used to decrypt', () => {
      // Encrypt with key A, swap to key B for decrypt
      process.env.MFA_SECRET_KEY = crypto.randomBytes(32).toString('base64');
      expect(() => service.decrypt(payload)).toThrow();
    });
  });

  describe('input validation', () => {
    it('rejects empty plaintext', () => {
      expect(() => service.encrypt('')).toThrow(/non-empty string/);
    });

    it('rejects payload missing fields', () => {
      // @ts-expect-error testing runtime validation with malformed input
      expect(() => service.decrypt({ ciphertext: Buffer.from('x') })).toThrow(
        /must include/,
      );
    });

    it('rejects wrong-length IV', () => {
      const payload = service.encrypt('JBSWY3DPEHPK3PXP');
      const wrongIv: EncryptedMfaSecret = {
        ciphertext: payload.ciphertext,
        iv: Buffer.alloc(8), // 8 bytes instead of 12
        authTag: payload.authTag,
      };
      expect(() => service.decrypt(wrongIv)).toThrow(/iv must be 12 bytes/);
    });

    it('rejects wrong-length auth tag', () => {
      const payload = service.encrypt('JBSWY3DPEHPK3PXP');
      const wrongTag: EncryptedMfaSecret = {
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        authTag: Buffer.alloc(8), // 8 bytes instead of 16
      };
      expect(() => service.decrypt(wrongTag)).toThrow(
        /authTag must be 16 bytes/,
      );
    });
  });

  describe('master key validation', () => {
    it('throws when MFA_SECRET_KEY is missing', () => {
      delete process.env.MFA_SECRET_KEY;
      expect(() => service.encrypt('x')).toThrow(/MFA_SECRET_KEY/);
    });

    it('throws when MFA_SECRET_KEY is too short', () => {
      // 16 bytes of random data, base64-encoded — valid base64, wrong length
      process.env.MFA_SECRET_KEY = crypto.randomBytes(16).toString('base64');
      expect(() => service.encrypt('x')).toThrow(/32 bytes/);
    });

    it('throws when MFA_SECRET_KEY is too long', () => {
      process.env.MFA_SECRET_KEY = crypto.randomBytes(64).toString('base64');
      expect(() => service.encrypt('x')).toThrow(/32 bytes/);
    });

    it('reads env var at call time, not at construction', () => {
      // Construct service with one key
      const fresh = new MfaSecretCipherService();
      const keyA = crypto.randomBytes(32).toString('base64');
      const keyB = crypto.randomBytes(32).toString('base64');

      process.env.MFA_SECRET_KEY = keyA;
      const payload = fresh.encrypt('JBSWY3DPEHPK3PXP');

      // Swap key — same instance must read updated env
      process.env.MFA_SECRET_KEY = keyB;
      expect(() => fresh.decrypt(payload)).toThrow();

      process.env.MFA_SECRET_KEY = keyA;
      expect(fresh.decrypt(payload)).toBe('JBSWY3DPEHPK3PXP');
    });
  });
});
