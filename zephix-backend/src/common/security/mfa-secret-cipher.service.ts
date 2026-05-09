import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Encrypted MFA secret payload — three pieces stored together on the User row
 * (`users.mfa_secret_ciphertext`, `users.mfa_secret_iv`, `users.mfa_secret_auth_tag`).
 *
 * IV is per-row (96-bit random per encrypt). Auth tag is GCM's 128-bit tag.
 */
export interface EncryptedMfaSecret {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * AES-256-GCM wrapper for encrypting MFA TOTP shared secrets at rest.
 *
 * Key derivation:
 *   Master key from `MFA_SECRET_KEY` env var, base64-encoded, 32 bytes after decode.
 *   The key is validated at first use — if missing, wrong length, or undecodable,
 *   `encrypt()` and `decrypt()` throw with clear errors. The service is registered
 *   in DI but does not validate at module init; lazy validation lets tests
 *   inject env vars without bootstrapping the whole NestJS context.
 *
 * Algorithm choice rationale:
 *   AES-256-GCM provides authenticated encryption — confidentiality and
 *   integrity in one primitive. Tampering with ciphertext or auth tag causes
 *   `decrypt()` to throw. Per-row IV ensures two encrypts of the same
 *   plaintext yield different ciphertexts (no chosen-plaintext leak).
 *
 * Storage:
 *   ciphertext: BYTEA (variable length, ~32 bytes for typical TOTP secret)
 *   iv:         BYTEA (12 bytes / 96 bits — recommended GCM IV size)
 *   authTag:    BYTEA (16 bytes / 128 bits — GCM tag length)
 *
 * Key rotation:
 *   Out of scope for B1. Single-key model is acceptable for staging Founding
 *   Members. Multi-key rotation infrastructure tracked in
 *   `docs/known-debt/pre-paying-customers.md` item S1.
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §2.1 + §4.1.
 */
@Injectable()
export class MfaSecretCipherService {
  private readonly logger = new Logger(MfaSecretCipherService.name);

  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH_BYTES = 32; // AES-256 → 256 bit key
  private static readonly IV_LENGTH_BYTES = 12; // 96-bit IV recommended for GCM
  private static readonly AUTH_TAG_LENGTH_BYTES = 16; // 128-bit GCM tag

  /**
   * Encrypt a plaintext TOTP secret.
   *
   * @throws Error if MFA_SECRET_KEY is missing or malformed.
   */
  encrypt(plaintext: string): EncryptedMfaSecret {
    if (typeof plaintext !== 'string' || plaintext.length === 0) {
      throw new Error('MfaSecretCipherService.encrypt: plaintext must be a non-empty string');
    }

    const key = this.resolveMasterKey();
    const iv = crypto.randomBytes(MfaSecretCipherService.IV_LENGTH_BYTES);

    const cipher = crypto.createCipheriv(
      MfaSecretCipherService.ALGORITHM,
      key,
      iv,
      { authTagLength: MfaSecretCipherService.AUTH_TAG_LENGTH_BYTES },
    );

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return { ciphertext, iv, authTag };
  }

  /**
   * Decrypt a previously encrypted MFA secret.
   *
   * @throws Error on tampering (auth tag mismatch), wrong key, or malformed input.
   */
  decrypt(payload: EncryptedMfaSecret): string {
    if (!payload || !payload.ciphertext || !payload.iv || !payload.authTag) {
      throw new Error(
        'MfaSecretCipherService.decrypt: payload must include ciphertext, iv, and authTag',
      );
    }
    if (payload.iv.length !== MfaSecretCipherService.IV_LENGTH_BYTES) {
      throw new Error(
        `MfaSecretCipherService.decrypt: iv must be ${MfaSecretCipherService.IV_LENGTH_BYTES} bytes`,
      );
    }
    if (payload.authTag.length !== MfaSecretCipherService.AUTH_TAG_LENGTH_BYTES) {
      throw new Error(
        `MfaSecretCipherService.decrypt: authTag must be ${MfaSecretCipherService.AUTH_TAG_LENGTH_BYTES} bytes`,
      );
    }

    const key = this.resolveMasterKey();

    const decipher = crypto.createDecipheriv(
      MfaSecretCipherService.ALGORITHM,
      key,
      payload.iv,
      { authTagLength: MfaSecretCipherService.AUTH_TAG_LENGTH_BYTES },
    );
    decipher.setAuthTag(payload.authTag);

    const plaintext = Buffer.concat([
      decipher.update(payload.ciphertext),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  }

  /**
   * Resolve the AES-256 master key from env. Base64-decoded; must be exactly 32 bytes.
   * Read at call time so test env vars set after module instantiation work.
   */
  private resolveMasterKey(): Buffer {
    const raw = process.env.MFA_SECRET_KEY;
    if (!raw) {
      throw new Error(
        'MFA_SECRET_KEY environment variable is required. Provide a 32-byte base64-encoded key (e.g., `openssl rand -base64 32`).',
      );
    }

    let decoded: Buffer;
    try {
      decoded = Buffer.from(raw, 'base64');
    } catch (e) {
      throw new Error(
        `MFA_SECRET_KEY is not valid base64: ${(e as Error).message}`,
      );
    }

    if (decoded.length !== MfaSecretCipherService.KEY_LENGTH_BYTES) {
      throw new Error(
        `MFA_SECRET_KEY must decode to exactly ${MfaSecretCipherService.KEY_LENGTH_BYTES} bytes; got ${decoded.length} bytes`,
      );
    }

    return decoded;
  }
}
