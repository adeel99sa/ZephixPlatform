import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { User } from '../../users/entities/user.entity';
import {
  EncryptedMfaSecret,
  MfaSecretCipherService,
} from '../../../common/security/mfa-secret-cipher.service';

/**
 * Result of MFA enrollment — frontend renders the QR and shows the manual
 * entry key as a fallback for users on devices without a camera.
 */
export interface MfaEnrollmentResult {
  /** TOTP shared secret in base32 (RFC 4648). Embedded in the QR; same value as manualEntryKey. */
  secret: string;
  /** `data:image/png;base64,...` URL for the otpauth:// QR code. */
  qrCodeDataUrl: string;
  /** Same as `secret`, kept as a separate field for frontend clarity. */
  manualEntryKey: string;
}

/**
 * TOTP-based MFA enrollment, verification, and revocation.
 *
 * Enrollment flow:
 *   1. enroll(userId) — generate fresh secret, encrypt, persist ciphertext.
 *      mfa_enabled stays FALSE until the user proves possession via verify().
 *      Re-enrolling overwrites any previous (unverified) secret.
 *   2. verify(userId, code) — decrypt stored secret, check TOTP code,
 *      flip mfa_enabled = true on success.
 *
 * Login flow (wired in PR2 cutover):
 *   - AuthService.login() detects mfa_enabled = true → returns mfaChallenge
 *     instead of full token pair.
 *   - Client retries with twoFactorCode → verifyForLogin(userId, code) →
 *     normal login response.
 *
 * Disable flow:
 *   - disable(userId) — clears ciphertext + iv + authTag, sets mfa_enabled = false.
 *     Caller (the controller) MUST require password re-confirmation before
 *     invoking this; the service trusts its caller for password proof.
 *
 * Grace-period semantics:
 *   - On admin login without MFA enrolled, AuthService stamps
 *     users.mfa_grace_until = now() + 7 days (only if not already set).
 *     After expiry, sensitive endpoints (`/api/v1/org/*` + role/membership
 *     changes) are blocked by an MfaRequiredGuard with code MFA_NOT_ENROLLED.
 *     Implemented in PR2.
 *
 * Algorithm:
 *   - SHA-1 HMAC, 6-digit code, 30-second time step (RFC 6238 + otplib defaults).
 *   - One-step window tolerance for clock drift (otplib default).
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §3.3 + §4.1, ADR-009.
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  /** Issuer label shown in authenticator apps. Static — single-tenant for B1. */
  private static readonly TOTP_ISSUER = 'Zephix';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cipher: MfaSecretCipherService,
  ) {}

  /**
   * Generate a fresh TOTP secret, encrypt it, persist on the User row, and
   * return the QR + manual-entry artifacts. Does NOT enable MFA until the
   * user verifies a code via verify().
   */
  async enroll(userId: string): Promise<MfaEnrollmentResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.mfaEnabled) {
      throw new ConflictException({
        code: 'MFA_ALREADY_ENROLLED',
        message:
          'MFA is already enabled. Disable it first if you want to re-enroll.',
      });
    }

    // Generate fresh base32 secret. If a prior un-verified secret exists, we
    // overwrite it — there is no "in progress" state worth preserving.
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(
      user.email,
      MfaService.TOTP_ISSUER,
      secret,
    );

    const encrypted = this.cipher.encrypt(secret);
    await this.userRepository.update(user.id, {
      mfaSecretCiphertext: encrypted.ciphertext,
      mfaSecretIv: encrypted.iv,
      mfaSecretAuthTag: encrypted.authTag,
      // mfaEnabled stays false until verify()
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return {
      secret,
      qrCodeDataUrl,
      manualEntryKey: secret,
    };
  }

  /**
   * Verify a TOTP code submitted during the enrollment flow. On success,
   * flips mfa_enabled = true.
   */
  async verify(userId: string, code: string): Promise<{ mfaEnabled: true }> {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new BadRequestException({
        code: 'MFA_INVALID_CODE',
        message: 'Invalid TOTP code format. Expected six digits.',
      });
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = this.decryptStoredSecret(user);
    if (!secret) {
      throw new BadRequestException({
        code: 'MFA_NOT_ENROLLED',
        message: 'MFA enrollment must be initiated before verification.',
      });
    }

    if (!authenticator.check(code, secret)) {
      throw new BadRequestException({
        code: 'MFA_INVALID_CODE',
        message: 'Invalid TOTP code',
      });
    }

    await this.userRepository.update(user.id, {
      mfaEnabled: true,
    });

    return { mfaEnabled: true };
  }

  /**
   * Verify a TOTP code during login. Caller (AuthService) is responsible for
   * issuing tokens on success and recording audit events.
   *
   * Used by PR2 cutover to wire the MFA challenge into the login flow.
   * Returns silently on success; throws UnauthorizedException on failure.
   */
  async verifyForLogin(userId: string, code: string): Promise<void> {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new UnauthorizedException({
        code: 'MFA_INVALID_CODE',
        message: 'Invalid MFA code',
      });
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.mfaEnabled) {
      throw new UnauthorizedException({
        code: 'MFA_NOT_ENROLLED',
        message: 'MFA is not enabled for this account',
      });
    }

    const secret = this.decryptStoredSecret(user);
    if (!secret) {
      // mfaEnabled = true but secret missing — corrupt state. Bail.
      this.logger.error(
        `Inconsistent MFA state for user ${user.id}: mfa_enabled=true but secret payload incomplete`,
      );
      throw new UnauthorizedException({
        code: 'MFA_INVALID_STATE',
        message: 'MFA configuration is inconsistent. Contact support.',
      });
    }

    if (!authenticator.check(code, secret)) {
      throw new UnauthorizedException({
        code: 'MFA_INVALID_CODE',
        message: 'Invalid MFA code',
      });
    }
  }

  /**
   * Disable MFA. Caller (controller) MUST verify the user's current password
   * before calling this method.
   */
  async disable(userId: string): Promise<{ mfaEnabled: false }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestException({
        code: 'MFA_NOT_ENROLLED',
        message: 'MFA is not currently enabled',
      });
    }

    await this.userRepository.update(user.id, {
      mfaEnabled: false,
      mfaSecretCiphertext: null,
      mfaSecretIv: null,
      mfaSecretAuthTag: null,
    });

    return { mfaEnabled: false };
  }

  /**
   * Returns true when the user is an org admin who has not enrolled MFA AND
   * whose grace window has expired. Used by the MfaRequiredGuard (PR2) on
   * sensitive endpoints.
   *
   * The grace stamp is set lazily on admin login by AuthService; this method
   * simply evaluates the snapshot.
   */
  isAdminBlockedByMfaPolicy(
    user: Pick<User, 'mfaEnabled' | 'mfaGraceUntil'>,
    now: Date = new Date(),
  ): boolean {
    if (user.mfaEnabled) {
      return false;
    }
    if (!user.mfaGraceUntil) {
      // Grace not stamped yet (e.g., user has never logged in post-B1). Don't block;
      // the next login will stamp it. Defensive default.
      return false;
    }
    return now > user.mfaGraceUntil;
  }

  /**
   * Decrypt the stored MFA secret payload. Returns null if any of the three
   * payload pieces is missing.
   */
  private decryptStoredSecret(user: User): string | null {
    if (
      !user.mfaSecretCiphertext ||
      !user.mfaSecretIv ||
      !user.mfaSecretAuthTag
    ) {
      return null;
    }
    const payload: EncryptedMfaSecret = {
      ciphertext: user.mfaSecretCiphertext,
      iv: user.mfaSecretIv,
      authTag: user.mfaSecretAuthTag,
    };
    return this.cipher.decrypt(payload);
  }
}
