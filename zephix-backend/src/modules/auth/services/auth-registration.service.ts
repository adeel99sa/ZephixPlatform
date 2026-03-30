import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../../users/entities/user.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { AuthOutbox } from '../entities/auth-outbox.entity';
import { TokenHashUtil } from '../../../common/security/token-hash.util';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction } from '../../audit/audit.constants';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';
import { shouldBypassEmailVerificationForEmail } from './staging-email-verification-bypass';

export interface RegisterSelfServeInput {
  email: string;
  password: string;
  fullName: string;
  ip?: string;
  userAgent?: string;
}

export interface RegisterSelfServeResponse {
  message: string;
}

@Injectable()
export class AuthRegistrationService {
  private readonly logger = new Logger(AuthRegistrationService.name);

  constructor(
    private dataSource: DataSource,
    private auditService: AuditService,
  ) {}

  /**
   * Self-serve registration: creates a user only (no organization yet).
   * Organization and workspace are created in the onboarding step after email verification.
   */
  async registerSelfServe(
    input: RegisterSelfServeInput,
  ): Promise<RegisterSelfServeResponse> {
    const { email, password, fullName, ip, userAgent } = input;
    const normalizedEmail = email.toLowerCase().trim();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 200) {
      throw new BadRequestException(
        'Full name must be between 2 and 200 characters',
      );
    }

    try {
      const skipEmailVerification =
        shouldBypassEmailVerificationForEmail(normalizedEmail);
      const result = await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const tokenRepo = manager.getRepository(EmailVerificationToken);
        const outboxRepo = manager.getRepository(AuthOutbox);

        const existingUser = await userRepo.findOne({
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          this.logger.warn(
            `Registration attempt for existing email: ${normalizedEmail}, requestId: ${requestId}`,
          );
          return { isExisting: true } as const;
        }

        const hashedPassword = await argon2.hash(password, {
          type: argon2.argon2id,
        });

        const nameParts = trimmedName.split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const user = userRepo.create({
          email: normalizedEmail,
          password: hashedPassword,
          firstName,
          lastName,
          organizationId: null,
          isEmailVerified: skipEmailVerification,
          emailVerifiedAt: skipEmailVerification ? new Date() : null,
          role: 'member',
          isActive: true,
        });
        const savedUser = await userRepo.save(user);

        let verificationToken: EmailVerificationToken | null = null;
        let expiresAt: Date | null = null;
        if (!skipEmailVerification) {
          const rawToken = TokenHashUtil.generateRawToken();
          const tokenHash = TokenHashUtil.hashToken(rawToken);
          expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);

          verificationToken = tokenRepo.create({
            userId: savedUser.id,
            tokenHash,
            expiresAt,
            ip: ip || null,
            userAgent: userAgent || null,
          });
          await tokenRepo.save(verificationToken);

          const outboxEvent = outboxRepo.create({
            type: 'auth.email_verification.requested',
            payloadJson: {
              userId: savedUser.id,
              email: normalizedEmail,
              token: rawToken,
              fullName: trimmedName,
            },
            status: 'pending',
            attempts: 0,
          });
          await outboxRepo.save(outboxEvent);
        }

        return {
          isExisting: false,
          savedUser,
          verificationTokenId: verificationToken?.id || null,
          firstName,
          lastName,
          expiresAt,
          skipEmailVerification,
        } as const;
      });

      if (result.isExisting) {
        return {
          message:
            'If an account with this email exists, you will receive a verification email.',
        };
      }

      const auditCtx = {
        organizationId: '',
        actorUserId: result.savedUser.id,
        actorPlatformRole: PlatformRole.MEMBER,
        ipAddress: ip,
        userAgent,
      };

      await this.auditService.record({
        ...auditCtx,
        entityType: AuditEntityType.USER,
        entityId: result.savedUser.id,
        action: AuditAction.USER_REGISTERED,
        after: {
          email: normalizedEmail,
          firstName: result.firstName,
          lastName: result.lastName,
          platformRole: PlatformRole.MEMBER,
          isEmailVerified: result.skipEmailVerification,
          organizationId: null,
        },
      });

      if (!result.skipEmailVerification && result.verificationTokenId && result.expiresAt) {
        await this.auditService.record({
          ...auditCtx,
          entityType: AuditEntityType.EMAIL_VERIFICATION,
          entityId: result.verificationTokenId,
          action: AuditAction.EMAIL_VERIFICATION_SENT,
          after: {
            email: normalizedEmail,
            expiresAt: result.expiresAt.toISOString(),
          },
        });
      }

      if (result.skipEmailVerification) {
        await this.auditService.record({
          ...auditCtx,
          entityType: AuditEntityType.EMAIL_VERIFICATION,
          entityId: result.savedUser.id,
          action: AuditAction.EMAIL_VERIFICATION_BYPASSED,
          metadata: {
            source: 'staging_email_bypass',
            trigger: 'register',
            reason: 'staging_bypass',
            allowlistedDomain: true,
            emailDomain: normalizedEmail.split('@').pop()?.toLowerCase() || '',
          },
        });
      }

      this.logger.log(
        `User registered (no org yet): ${normalizedEmail}, userId: ${result.savedUser.id}`,
      );

      return {
        message:
          'If an account with this email exists, you will receive a verification email.',
      };
    } catch (error: any) {
      const errorCode = error?.code || error?.driverError?.code;
      const isUniqueViolation = errorCode === '23505' || errorCode === 23505;

      const errorRequestId =
        error?.requestId || requestId || `req-${Date.now()}`;
      this.logger.error(
        `Registration error caught - requestId: ${errorRequestId}, error.name: ${error?.name || 'unknown'}, error.code: ${error?.code || 'unknown'}`,
      );

      if (isUniqueViolation || error instanceof QueryFailedError) {
        const pgError = error?.driverError || error;
        const constraintName = pgError?.constraint || error?.constraint || '';
        const tableName = pgError?.table || error?.table || '';
        const errorMessage = (
          pgError?.message ||
          error?.message ||
          ''
        ).toLowerCase();
        const errorDetail = (
          pgError?.detail ||
          error?.detail ||
          ''
        ).toLowerCase();

        const tableNameLower = tableName.toLowerCase();
        const errorDetailLower = errorDetail.toLowerCase();

        const isUsersTable =
          tableNameLower === 'users' ||
          errorMessage.includes('users') ||
          errorMessage.includes('"users"');
        const mentionsEmail =
          errorDetailLower.includes('email') ||
          errorDetailLower.includes('(email)') ||
          errorMessage.includes('email') ||
          String(constraintName).toLowerCase().includes('email');

        if (isUsersTable && mentionsEmail) {
          this.logger.warn(
            `Registration duplicate key (race): ${normalizedEmail}`,
          );
          return {
            message:
              'If an account with this email exists, you will receive a verification email.',
          };
        }
      }
      throw error;
    }
  }
}
