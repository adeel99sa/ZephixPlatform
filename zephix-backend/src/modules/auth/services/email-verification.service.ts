import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { AuthOutbox } from '../entities/auth-outbox.entity';
import { TokenHashUtil } from '../../../common/security/token-hash.util';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction } from '../../audit/audit.constants';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(EmailVerificationToken)
    private tokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(AuthOutbox)
    private authOutboxRepository: Repository<AuthOutbox>,
    private dataSource: DataSource,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new verification token for a user
   */
  async createToken(
    userId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate and hash token (deterministic HMAC-SHA256)
    const rawToken = TokenHashUtil.generateRawToken();
    const tokenHash = TokenHashUtil.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    // Invalidate any existing tokens for this user
    await this.tokenRepository.update(
      { userId, usedAt: null },
      { usedAt: new Date() },
    );

    // Create new token
    const token = this.tokenRepository.create({
      userId,
      tokenHash,
      expiresAt,
      ip: ip || null,
      userAgent: userAgent || null,
    });
    await this.tokenRepository.save(token);

    // Create outbox event for email delivery
    const outboxEvent = this.authOutboxRepository.create({
      type: 'auth.email_verification.requested',
      payloadJson: {
        userId,
        email: user.email,
        token: rawToken, // Only in outbox, never in DB
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      },
      status: 'pending',
      attempts: 0,
    });
    await this.authOutboxRepository.save(outboxEvent);

    this.logger.log(`Verification token created for user: ${userId}`);

    return rawToken; // Return raw token for email (never stored in DB)
  }

  /**
   * Verify a token and mark email as verified
   *
   * Uses indexed lookup by deterministic hash (HMAC-SHA256)
   */
  async verifyToken(rawToken: string): Promise<{ userId: string }> {
    // Compute hash and do indexed lookup
    const tokenHash = TokenHashUtil.hashToken(rawToken);

    // Find token by hash (indexed lookup)
    const token = await this.tokenRepository.findOne({
      where: {
        tokenHash,
        usedAt: null,
      },
    });

    if (!token) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (token.isExpired()) {
      throw new BadRequestException('Verification token has expired');
    }

    // Mark token as used and verify user email in transaction
    return this.dataSource.transaction(async (manager) => {
      const tokenRepo = manager.getRepository(EmailVerificationToken);
      const userRepo = manager.getRepository(User);

      // Mark token as used
      await tokenRepo.update(token.id, {
        usedAt: new Date(),
      });

      await userRepo.update(token.userId, {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      });

      const user = await userRepo.findOne({ where: { id: token.userId } });

      await this.auditService.record({
        organizationId: user?.organizationId || '',
        actorUserId: token.userId,
        actorPlatformRole: 'ADMIN',
        entityType: AuditEntityType.USER,
        entityId: token.userId,
        action: AuditAction.EMAIL_VERIFIED,
        after: { isEmailVerified: true, emailVerifiedAt: new Date().toISOString() },
      }, { manager });

      this.logger.log(`Email verified for user: ${token.userId}`);

      return { userId: token.userId };
    });
  }

  /**
   * Get latest outbox rows by userId
   *
   * Phase 1 requirement: repo query helper for latest outbox rows by userId.
   * Useful for testing and debugging email verification flows.
   */
  async getLatestOutboxByUserId(
    userId: string,
    limit: number = 10,
  ): Promise<AuthOutbox[]> {
    // Query using JSONB path to find events with matching userId in payload
    return this.authOutboxRepository
      .createQueryBuilder('outbox')
      .where("outbox.payloadJson->>'userId' = :userId", { userId })
      .orderBy('outbox.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }
}
