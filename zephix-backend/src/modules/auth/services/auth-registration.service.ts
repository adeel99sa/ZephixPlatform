import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { AuthOutbox } from '../entities/auth-outbox.entity';
import { TokenHashUtil } from '../../../common/security/token-hash.util';
import {
  validateOrgSlug,
  slugify,
  generateAvailableSlug,
} from '../../../common/utils/slug.util';

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
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(EmailVerificationToken)
    private emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(AuthOutbox)
    private authOutboxRepository: Repository<AuthOutbox>,
    private dataSource: DataSource,
  ) {}

  /**
   * Register a new user with self-serve organization creation
   *
   * This method:
   * - Creates user, org, user_organizations, workspace, token, and outbox event in one transaction
   * - Never reveals if email already exists (neutral response)
   * - Supports idempotency (if user exists, still returns neutral response)
   * - Stores verification token as hash only
   */
  async registerSelfServe(
    input: RegisterSelfServeInput,
  ): Promise<RegisterSelfServeResponse> {
    const { email, password, fullName, orgName, orgSlug, ip, userAgent } = input;
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

    // Use transaction for atomicity
    try {
      return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const orgRepo = manager.getRepository(Organization);
      const userOrgRepo = manager.getRepository(UserOrganization);
      const workspaceRepo = manager.getRepository(Workspace);
      const workspaceMemberRepo = manager.getRepository(WorkspaceMember);
      const tokenRepo = manager.getRepository(EmailVerificationToken);
      const outboxRepo = manager.getRepository(AuthOutbox);

      // Check if user exists (but don't reveal in error)
      const existingUser = await userRepo.findOne({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        // Idempotency: if user exists, return neutral response
        // This prevents account enumeration
        this.logger.warn(
          `Registration attempt for existing email: ${normalizedEmail}, requestId: ${requestId}`,
        );
        return {
          message:
            'If an account with this email exists, you will receive a verification email.',
        };
      }

      // Generate available slug with deterministic suffix retry
      const checkSlugExists = async (slug: string): Promise<boolean> => {
        const existing = await orgRepo.findOne({ where: { slug } });
        return !!existing;
      };

      const availableSlug = await generateAvailableSlug(
        finalSlug,
        checkSlugExists,
        10, // max attempts
      );

      // Create organization with the available slug
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

      // Hash password (OWASP: bcrypt with 12 rounds minimum)
      const hashedPassword = await bcrypt.hash(password, 12);

      // Parse fullName into firstName and lastName
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create user (email not verified yet)
      const user = userRepo.create({
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        organizationId: savedOrg.id,
        isEmailVerified: false,
        emailVerifiedAt: null,
        role: 'admin', // First user is admin
        isActive: true,
      });
      const savedUser = await userRepo.save(user);

      // Create UserOrganization record (org_owner role)
      const userOrg = userOrgRepo.create({
        userId: savedUser.id,
        organizationId: savedOrg.id,
        role: 'owner', // First user becomes org_owner
        isActive: true,
        joinedAt: new Date(),
      });
      await userOrgRepo.save(userOrg);

      // Create default workspace
      const workspace = workspaceRepo.create({
        name: 'Default Workspace',
        slug: 'default',
        organizationId: savedOrg.id,
        createdBy: savedUser.id,
        ownerId: savedUser.id,
        isPrivate: false,
      });
      const savedWorkspace = await workspaceRepo.save(workspace);

      // Create workspace membership
      const workspaceMember = workspaceMemberRepo.create({
        workspaceId: savedWorkspace.id,
        userId: savedUser.id,
        role: 'workspace_owner',
        createdBy: savedUser.id,
      });
      await workspaceMemberRepo.save(workspaceMember);

      // Generate and hash verification token (deterministic HMAC-SHA256)
      const rawToken = TokenHashUtil.generateRawToken();
      const tokenHash = TokenHashUtil.hashToken(rawToken);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      // Create verification token record (hash only)
      const verificationToken = tokenRepo.create({
        userId: savedUser.id,
        tokenHash,
        expiresAt,
        ip: ip || null,
        userAgent: userAgent || null,
      });
      await tokenRepo.save(verificationToken);

      // Create outbox event for email delivery
      const outboxEvent = outboxRepo.create({
        type: 'auth.email_verification.requested',
        payloadJson: {
          userId: savedUser.id,
          email: normalizedEmail,
          token: rawToken, // Only in outbox, never in DB
          fullName,
          orgName,
        },
        status: 'pending',
        attempts: 0,
      });
      await outboxRepo.save(outboxEvent);

      // Audit log
      this.logger.log(
        `User registered: ${normalizedEmail}, org: ${savedOrg.id}, workspace: ${savedWorkspace.id}`,
      );

      // Always return neutral response (no account enumeration)
      return {
        message:
          'If an account with this email exists, you will receive a verification email.',
      };
      });
    } catch (error: any) {
      // Handle Postgres unique constraint violation (race condition)
      // Error code 23505 = unique_violation
      // TypeORM wraps Postgres errors in QueryFailedError
      // The error code might be on error.code or error.driverError.code
      const errorCode = error?.code || error?.driverError?.code;
      const isUniqueViolation = errorCode === '23505' || errorCode === 23505;

      // Log full error structure for debugging
      const errorRequestId = (error as any)?.requestId || requestId || `req-${Date.now()}`;
      this.logger.error(
        `Registration error caught - requestId: ${errorRequestId}, error.name: ${error?.name || 'unknown'}, error.code: ${error?.code || 'unknown'}, driverError.code: ${error?.driverError?.code || 'unknown'}, driverError.table: ${error?.driverError?.table || 'unknown'}, driverError.constraint: ${error?.driverError?.constraint || 'unknown'}, driverError.detail: ${error?.driverError?.detail || 'unknown'}`,
      );

      if (isUniqueViolation || error instanceof QueryFailedError) {
        // Extract error details from TypeORM QueryFailedError or direct Postgres error
        // TypeORM may nest the Postgres error in driverError
        const pgError = error?.driverError || error;
        const constraintName = pgError?.constraint || error?.constraint || '';
        const tableName = pgError?.table || error?.table || '';
        const errorMessage = (pgError?.message || error?.message || '').toLowerCase();
        const errorDetail = (pgError?.detail || error?.detail || '').toLowerCase();

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
        const isWorkspaceTable =
          tableNameLower === 'workspaces' ||
          errorMessage.includes('workspaces') ||
          errorMessage.includes('"workspaces"');

        // Check for slug/name mentions in detail (most reliable)
        // PostgreSQL detail format: "Key (slug)=(value) already exists."
        const mentionsSlug =
          errorDetailLower.includes('(slug)') ||  // Most specific - PostgreSQL format
          errorDetailLower.includes('slug') ||
          constraintNameLower.includes('slug');
        const mentionsName =
          errorDetailLower.includes('(name)') ||  // Most specific - PostgreSQL format
          errorDetailLower.includes('name') ||
          constraintNameLower.includes('name');

        // Log the detection logic for org slug handler
        this.logger.warn(
          `[ORG_SLUG_HANDLER] requestId: ${errorRequestId}, isOrgTable: ${isOrgTable}, isWorkspaceTable: ${isWorkspaceTable}, mentionsSlug: ${mentionsSlug}, mentionsName: ${mentionsName}, tableName: ${tableName || 'empty'}, constraintName: ${constraintName || 'empty'}, errorDetail: ${errorDetail || 'empty'}, errorMessage: ${errorMessage || 'empty'}`,
        );

        // If we detect org/workspace table AND slug/name, throw 409
        // Also handle case where table name is missing but we see slug in detail (registration context)
        if ((isOrgTable || isWorkspaceTable) && (mentionsSlug || mentionsName)) {
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
