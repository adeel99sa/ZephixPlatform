import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

import { User } from '../../modules/users/entities/user.entity';
import { PasswordReset } from '../entities/password-reset.entity';
import {
  PasswordResetRequestDto,
  PasswordResetConfirmDto,
} from '../dto/password-reset.dto';

/**
 * Password Reset Service
 *
 * Implements secure password reset flow following OWASP ASVS Level 1:
 * - Secure token generation (cryptographically strong)
 * - Token hashing (never store plain text tokens)
 * - 30-minute TTL (recommended security practice)
 * - Single-use tokens (prevent replay attacks)
 * - Account enumeration protection
 * - Comprehensive security logging
 * - Rate limiting integration
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly TOKEN_LENGTH = 32; // 32 bytes = 256 bits
  private readonly TOKEN_TTL_MINUTES = 30; // OWASP recommended
  private readonly MAX_ACTIVE_TOKENS_PER_USER = 3; // Prevent token flooding

  constructor(
    @Optional()
    @InjectRepository(User)
    private readonly userRepository: Repository<User> | null,

    @Optional()
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset> | null,
  ) {
    if (!this.userRepository || !this.passwordResetRepository) {
      this.logger.warn(
        'Password reset service running in limited mode - database not available',
      );
    }
  }

  /**
   * Initiate password reset flow
   *
   * SECURITY: Always returns success to prevent account enumeration
   */
  async initiatePasswordReset(
    dto: PasswordResetRequestDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string }> {
    // Emergency mode check
    if (!this.userRepository || !this.passwordResetRepository) {
      throw new ServiceUnavailableException(
        'Password reset is temporarily unavailable. Please try again later.',
      );
    }

    const { email } = dto;

    try {
      // Security logging
      this.logger.log('Password reset initiated', {
        email: this.maskEmail(email),
        ipAddress,
        userAgent: userAgent?.substring(0, 100), // Truncate for logging
        timestamp: new Date().toISOString(),
      });

      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      // SECURITY: Always return success to prevent account enumeration
      if (!user) {
        this.logger.warn('Password reset attempted for non-existent user', {
          email: this.maskEmail(email),
          ipAddress,
        });

        // Simulate processing time to prevent timing attacks
        await this.simulateProcessingDelay();

        return {
          success: true,
          message:
            'If an account with this email exists, a password reset link has been sent.',
        };
      }

      // Check if user account is active
      if (!user.isActive) {
        this.logger.warn('Password reset attempted for inactive user', {
          userId: user.id,
          email: this.maskEmail(email),
          ipAddress,
        });

        // Still return success for security
        await this.simulateProcessingDelay();
        return {
          success: true,
          message:
            'If an account with this email exists, a password reset link has been sent.',
        };
      }

      // Clean up expired tokens for this user
      await this.cleanupExpiredTokens(user.id);

      // Check for too many active tokens (prevent token flooding)
      const activeTokenCount = await this.passwordResetRepository.count({
        where: {
          userId: user.id,
          isUsed: false,
          expiresAt: MoreThan(new Date()), // Use proper date comparison
        },
      });

      if (activeTokenCount >= this.MAX_ACTIVE_TOKENS_PER_USER) {
        this.logger.warn('Too many active password reset tokens', {
          userId: user.id,
          email: this.maskEmail(email),
          activeTokenCount,
          ipAddress,
        });

        // Invalidate old tokens and proceed
        await this.invalidateUserTokens(user.id);
      }

      // Generate cryptographically secure token
      const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.TOKEN_TTL_MINUTES);

      // Create password reset record
      const passwordReset = this.passwordResetRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
        isUsed: false,
      });

      await this.passwordResetRepository.save(passwordReset);

      // TODO: Send email with reset link
      // For now, we'll log the token for testing (REMOVE IN PRODUCTION)
      this.logger.debug('Password reset token generated', {
        userId: user.id,
        email: this.maskEmail(email),
        token: token.substring(0, 8) + '...', // Log only first 8 chars for debugging
        expiresAt: expiresAt.toISOString(),
      });

      // Security logging
      this.logger.log('Password reset token sent', {
        userId: user.id,
        email: this.maskEmail(email),
        ipAddress,
        expiresAt: expiresAt.toISOString(),
      });

      return {
        success: true,
        message:
          'If an account with this email exists, a password reset link has been sent.',
      };
    } catch (error) {
      this.logger.error('Password reset initiation failed', {
        email: this.maskEmail(email),
        ipAddress,
        error: error.message,
      });

      // Return generic success for security
      await this.simulateProcessingDelay();
      return {
        success: true,
        message:
          'If an account with this email exists, a password reset link has been sent.',
      };
    }
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(
    dto: PasswordResetConfirmDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string }> {
    // Emergency mode check
    if (!this.userRepository || !this.passwordResetRepository) {
      throw new ServiceUnavailableException(
        'Password reset is temporarily unavailable. Please try again later.',
      );
    }

    const { token, newPassword, confirmPassword } = dto;

    // Validate password match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    try {
      // Hash the provided token to find the record
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find the password reset record
      const passwordReset = await this.passwordResetRepository.findOne({
        where: { tokenHash },
        relations: ['user'],
      });

      if (!passwordReset) {
        this.logger.warn('Invalid password reset token used', {
          tokenHash: tokenHash.substring(0, 16) + '...', // Log partial hash for debugging
          ipAddress,
          userAgent,
        });
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Check if token is valid
      if (!passwordReset.isValid()) {
        this.logger.warn('Expired or used password reset token', {
          userId: passwordReset.userId,
          isUsed: passwordReset.isUsed,
          isExpired: passwordReset.isExpired(),
          ipAddress,
        });
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Check if user is still active
      if (!passwordReset.user.isActive) {
        this.logger.warn('Password reset attempted for inactive user', {
          userId: passwordReset.userId,
          ipAddress,
        });
        throw new BadRequestException('Account is not active');
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      await this.userRepository.update(passwordReset.userId, {
        password: hashedPassword,
        updatedAt: new Date(),
      });

      // Mark token as used
      passwordReset.markAsUsed(ipAddress);
      await this.passwordResetRepository.save(passwordReset);

      // Invalidate all other tokens for this user
      await this.invalidateUserTokens(passwordReset.userId, passwordReset.id);

      // Security logging
      this.logger.log('Password reset completed successfully', {
        userId: passwordReset.userId,
        ipAddress,
        resetRequestedAt: passwordReset.createdAt,
        resetCompletedAt: new Date(),
      });

      return {
        success: true,
        message:
          'Password has been reset successfully. Please log in with your new password.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Password reset confirmation failed', {
        ipAddress,
        error: error.message,
      });

      throw new BadRequestException('Password reset failed. Please try again.');
    }
  }

  /**
   * Validate password reset token (for frontend validation)
   */
  async validateResetToken(
    token: string,
  ): Promise<{ valid: boolean; expired?: boolean }> {
    if (!this.passwordResetRepository) {
      throw new ServiceUnavailableException(
        'Token validation temporarily unavailable',
      );
    }

    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const passwordReset = await this.passwordResetRepository.findOne({
        where: { tokenHash },
        relations: ['user'],
      });

      if (!passwordReset) {
        return { valid: false };
      }

      if (passwordReset.isUsed) {
        return { valid: false };
      }

      if (passwordReset.isExpired()) {
        return { valid: false, expired: true };
      }

      if (!passwordReset.user?.isActive) {
        return { valid: false };
      }

      return { valid: true };
    } catch (error) {
      this.logger.error('Token validation failed', { error: error.message });
      return { valid: false };
    }
  }

  /**
   * Clean up expired tokens (called periodically)
   */
  async cleanupExpiredTokens(userId?: string): Promise<number> {
    if (!this.passwordResetRepository) {
      return 0;
    }

    try {
      const query = this.passwordResetRepository
        .createQueryBuilder()
        .delete()
        .where('expiresAt < :now', { now: new Date() });

      if (userId) {
        query.andWhere('userId = :userId', { userId });
      }

      const result = await query.execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(
          `Cleaned up ${result.affected} expired password reset tokens`,
        );
      }

      return result.affected || 0;
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', {
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Invalidate all active tokens for a user
   */
  private async invalidateUserTokens(
    userId: string,
    excludeId?: string,
  ): Promise<void> {
    if (!this.passwordResetRepository) {
      return;
    }

    const query = this.passwordResetRepository
      .createQueryBuilder()
      .update()
      .set({ isUsed: true, usedAt: new Date() })
      .where('userId = :userId AND isUsed = false', { userId });

    if (excludeId) {
      query.andWhere('id != :excludeId', { excludeId });
    }

    await query.execute();
  }

  /**
   * Mask email for logging (security)
   */
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `**@${domain}`;
    }
    return `${localPart.substring(0, 2)}***@${domain}`;
  }

  /**
   * Simulate processing delay to prevent timing attacks
   */
  private async simulateProcessingDelay(): Promise<void> {
    const delay = Math.random() * 1000 + 500; // 500-1500ms random delay
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
