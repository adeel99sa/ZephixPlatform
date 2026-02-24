import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { AuthOutbox } from '../entities/auth-outbox.entity';
import { TokenHashUtil } from '../../../common/security/token-hash.util';
import {
  validateOrgSlug,
  slugify,
  generateAvailableSlug,
} from '../../../common/utils/slug.util';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction } from '../../audit/audit.constants';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';
import { isSkipEmailVerificationEnabled } from '../utils/email-verification-policy';

export interface RegisterSelfServeInput {
  email: string;
  password: string;
  fullName: string;
  orgName: string;
  orgSlug?: string;
  ip?: string;
  userAgent?: string;
}

export interface RegisterSelfServeResponse {
  message: string;
  // Never include user details or tokens in response to prevent enumeration
}

@Injectable()
export class AuthRegistrationService {
  private readonly logger = new Logger(AuthRegistrationService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrgRepository: Repository<UserOrganization>,
    @InjectRepository(EmailVerificationToken)
    private emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(AuthOutbox)
    private authOutboxRepository: Repository<AuthOutbox>,
    private dataSource: DataSource,
    private auditService: AuditService,
  ) {}

  /**
   * Register a new user with self-serve organization creation
   *
   * This method:
   * - Creates user, org, user_organizations, token, and outbox event in one transaction
   * - Does NOT create workspace or workspace membership (enterprise: explicit setup)
   * - Never reveals if email already exists (neutral response)
   * - Supports idempotency (if user exists, still returns neutral response)
   * - Stores verification token as hash only
   */
  async registerSelfServe(
    input: RegisterSelfServeInput,
  ): Promise<RegisterSelfServeResponse> {
    const { email, password, fullName, orgName, orgSlug, ip, userAgent } =
      input;
    const normalizedEmail = email.toLowerCase().trim();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Validate password strength (OWASP guidance)
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    // Validate orgName length (2-80 characters)
    if (!orgName || orgName.trim().length < 2 || orgName.trim().length > 80) {
      throw new BadRequestException(
        'Organization name must be between 2 and 80 characters',
      );
    }

    // Validate orgSlug if provided
    let finalSlug: string;
    if (orgSlug) {
      const validation = validateOrgSlug(orgSlug);
      if (!validation.valid) {
        throw new BadRequestException(validation.error);
      }
      finalSlug = orgSlug;
    } else {
      // Generate slug from orgName
      finalSlug = slugify(orgName);
      if (!finalSlug) {
        throw new BadRequestException(
          'Could not generate a valid slug from organization name',
        );
      }
    }

    try {
      const skipEmailVerification = isSkipEmailVerificationEnabled();
      const result = await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const orgRepo = manager.getRepository(Organization);
        const userOrgRepo = manager.getRepository(UserOrganization);
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

        const checkSlugExists = async (slug: string): Promise<boolean> => {
          const existing = await orgRepo.findOne({ where: { slug } });
          return !!existing;
        };

        let availableSlug: string;
        try {
          availableSlug = await generateAvailableSlug(
            finalSlug,
            checkSlugExists,
            10,
          );
        } catch {
          throw new ConflictException(
            'This organization name is too common. Please choose a more unique name or provide a custom slug.',
          );
        }

        const organization = orgRepo.create({
          name: orgName.trim(),
          slug: availableSlug,
          status: 'trial',
          settings: {
            resourceManagement: {
              maxAllocationPercentage: 150,
              warningThreshold: 80,
              criticalThreshold: 100,
            },
          },
        });
        const savedOrg = await orgRepo.save(organization);

        const hashedPassword = await bcrypt.hash(password, 12);

        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const user = userRepo.create({
          email: normalizedEmail,
          password: hashedPassword,
          firstName,
          lastName,
          organizationId: savedOrg.id,
          isEmailVerified: skipEmailVerification,
          emailVerifiedAt: skipEmailVerification ? new Date() : null,
          role: PlatformRole.ADMIN,
          isActive: true,
        });
        const savedUser = await userRepo.save(user);

        const userOrg = userOrgRepo.create({
          userId: savedUser.id,
          organizationId: savedOrg.id,
          role: 'owner',
          isActive: true,
          joinedAt: new Date(),
        });
        await userOrgRepo.save(userOrg);

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
              fullName,
              orgName,
            },
            status: 'pending',
            attempts: 0,
          });
          await outboxRepo.save(outboxEvent);
        }

        return {
          isExisting: false,
          savedOrg,
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

      // Audit writes outside the transaction — PostgreSQL transaction poisoning safe
      const auditCtx = {
        organizationId: result.savedOrg.id,
        actorUserId: result.savedUser.id,
        actorPlatformRole: PlatformRole.ADMIN,
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
          platformRole: PlatformRole.ADMIN,
          isEmailVerified: result.skipEmailVerification,
        },
      });

      await this.auditService.record({
        ...auditCtx,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: result.savedOrg.id,
        action: AuditAction.ORG_CREATED,
        after: {
          name: result.savedOrg.name,
          slug: result.savedOrg.slug,
          status: result.savedOrg.status,
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

      this.logger.log(
        `User registered: ${normalizedEmail}, org: ${result.savedOrg.id}, platformRole: ${PlatformRole.ADMIN}`,
      );

      return {
        message:
          'If an account with this email exists, you will receive a verification email.',
      };
    } catch (error: any) {
      // Handle Postgres unique constraint violation (race condition)
      // Error code 23505 = unique_violation
      // TypeORM wraps Postgres errors in QueryFailedError
      // The error code might be on error.code or error.driverError.code
      const errorCode = error?.code || error?.driverError?.code;
      const isUniqueViolation = errorCode === '23505' || errorCode === 23505;

      // Log full error structure for debugging
      const errorRequestId =
        error?.requestId || requestId || `req-${Date.now()}`;
      this.logger.error(
        `Registration error caught - requestId: ${errorRequestId}, error.name: ${error?.name || 'unknown'}, error.code: ${error?.code || 'unknown'}, driverError.code: ${error?.driverError?.code || 'unknown'}, driverError.table: ${error?.driverError?.table || 'unknown'}, driverError.constraint: ${error?.driverError?.constraint || 'unknown'}, driverError.detail: ${error?.driverError?.detail || 'unknown'}`,
      );

      if (isUniqueViolation || error instanceof QueryFailedError) {
        // Extract error details from TypeORM QueryFailedError or direct Postgres error
        // TypeORM may nest the Postgres error in driverError
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

        // Extract table and column information
        const tableNameLower = tableName.toLowerCase();
        const errorDetailLower = errorDetail.toLowerCase();
        const constraintNameLower = constraintName.toLowerCase();

        // Check if this is a users.email constraint violation
        // Detail typically looks like: "Key (email)=(test@example.com) already exists."
        // Constraint names may be auto-generated (e.g., UQ_963693341bd612aa01ddf3a4b68)
        const isUsersTable =
          tableNameLower === 'users' ||
          errorMessage.includes('users') ||
          errorMessage.includes('"users"');
        const mentionsEmail =
          errorDetailLower.includes('email') ||
          errorDetailLower.includes('(email)') ||
          errorMessage.includes('email') ||
          constraintNameLower.includes('email');

        // Handle users.email constraint - return neutral response (anti-enumeration)
        if (isUsersTable && mentionsEmail) {
          this.logger.warn(
            `Registration duplicate key violation (race condition): ${normalizedEmail}, table: ${tableName || 'unknown'}, constraint: ${constraintName || 'unknown'}`,
          );
          // Return neutral response (no account enumeration)
          return {
            message:
              'If an account with this email exists, you will receive a verification email.',
          };
        }

        // Handle organizations/workspaces unique violations - return 409 Conflict
        // Org/workspace duplicates are not sensitive, so we can return clear error messages
        // Check table name from multiple sources
        const isOrgTable =
          tableNameLower === 'organizations' ||
          tableNameLower === 'orgs' ||
          errorMessage.includes('organizations') ||
          errorMessage.includes('"organizations"') ||
          // Fallback: if we're in registration and see slug constraint, assume org
          (tableName === '' && errorDetailLower.includes('(slug)'));
        const isWorkspaceTable = false;

        // Check for slug/name mentions in detail (most reliable)
        // PostgreSQL detail format: "Key (slug)=(value) already exists."
        const mentionsSlug =
          errorDetailLower.includes('(slug)') || // Most specific - PostgreSQL format
          errorDetailLower.includes('slug') ||
          constraintNameLower.includes('slug');
        const mentionsName =
          errorDetailLower.includes('(name)') || // Most specific - PostgreSQL format
          errorDetailLower.includes('name') ||
          constraintNameLower.includes('name');

        // Log the detection logic for org slug handler
        this.logger.warn(
          `[ORG_SLUG_HANDLER] requestId: ${errorRequestId}, isOrgTable: ${isOrgTable}, isWorkspaceTable: ${isWorkspaceTable}, mentionsSlug: ${mentionsSlug}, mentionsName: ${mentionsName}, tableName: ${tableName || 'empty'}, constraintName: ${constraintName || 'empty'}, errorDetail: ${errorDetail || 'empty'}, errorMessage: ${errorMessage || 'empty'}`,
        );

        // If we detect org/workspace table AND slug/name, throw 409
        // Also handle case where table name is missing but we see slug in detail (registration context)
        if (
          (isOrgTable || isWorkspaceTable) &&
          (mentionsSlug || mentionsName)
        ) {
          const entityType = isOrgTable ? 'organization' : 'workspace';
          const fieldType = mentionsSlug ? 'slug' : 'name';
          this.logger.warn(
            `Registration ${entityType} duplicate: ${fieldType} already exists, table: ${tableName || 'inferred'}, constraint: ${constraintName || 'unknown'}, requestId: ${errorRequestId}`,
          );
          // Phase 1 requirement: specific message for org slug conflicts
          if (isOrgTable && mentionsSlug) {
            throw new ConflictException(
              'Organization slug already exists. Choose a different slug.',
            );
          }
          throw new ConflictException(
            `An ${entityType} with this ${fieldType} already exists. Please choose a different ${fieldType}.`,
          );
        }

        // Fallback: If we see slug in detail but no table name, and we're in registration context,
        // assume it's an org slug (since registration creates orgs, not workspaces)
        if (!tableName && mentionsSlug && errorDetailLower.includes('(slug)')) {
          this.logger.warn(
            `Registration org duplicate (fallback detection): slug constraint detected without table name, constraint: ${constraintName || 'unknown'}, requestId: ${errorRequestId}`,
          );
          throw new ConflictException(
            'Organization slug already exists. Choose a different slug.',
          );
        }

        // If it's a unique violation but not handled above, log and re-throw
        this.logger.error(
          `Unique constraint violation (unhandled): constraint: ${constraintName || 'unknown'}, table: ${tableName || 'unknown'}, detail: ${errorDetail || 'none'}, message: ${errorMessage || 'none'}, requestId: ${errorRequestId}`,
        );
      }
      // Re-throw all other errors
      throw error;
    }
  }
}
