/**
 * ROLE MAPPING SUMMARY:
 * - Database layer: UserOrganization.role = 'owner' | 'admin' | 'member' | 'viewer'
 * - Database layer: User.role = legacy string (e.g., 'admin', 'pm', 'viewer')
 * - API responses: role = 'ADMIN' | 'MEMBER' | 'VIEWER' (normalized PlatformRole)
 * - API responses: platformRole = same as role (explicit enum field)
 * - API responses: permissions.isAdmin = true only for ADMIN platformRole
 */
import {
  Injectable,
  Inject,
  Logger,
  Optional,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../users/entities/user.entity'; // Fixed path
import { Organization } from '../../organizations/entities/organization.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { AuthSession } from './entities/auth-session.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../shared/enums/platform-roles.enum';
import { TokenHashUtil } from '../../common/security/token-hash.util';
import { createHash } from 'crypto';
import { AuditService } from '../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.constants';
import {
  shouldBypassEmailVerificationForEmail,
} from './services/staging-email-verification-bypass';
import { AUTH_RATE_LIMIT_STORE } from './tokens';
import type { AuthRateLimitStore } from './services/auth-rate-limit-store';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { OrgProvisioningService } from './services/org-provisioning.service';
import { EmailService } from '../../shared/services/email.service';
import {
  generateAvailableSlug,
  slugify,
  validateOrgSlug,
} from '../../common/utils/slug.util';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { AuthOutbox } from './entities/auth-outbox.entity';
import { AppException } from '../../shared/errors/app-exception';
import { ErrorCode } from '../../shared/errors/error-codes';
import {
  IdentityEventBus,
  IDENTITY_EVENT_BUS,
} from '../../common/events/identity-event-bus';

export interface GoogleOAuthProfileInput {
  googleId: string;
  email: string;
  emailVerifiedFromGoogle: boolean;
  displayName: string;
  givenName?: string;
  familyName?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * Dummy bcrypt hash used for timing-equalization on user-not-found in login()
   * (ADR-008). Lazy-initialized on first miss to avoid blocking module import.
   * The plaintext is irrelevant — only the hash's structural similarity to a
   * real password hash matters, so bcrypt.compare runs the full algorithm.
   */
  private static dummyBcryptHashCache: string | null = null;
  private static getDummyBcryptHash(): string {
    if (!AuthService.dummyBcryptHashCache) {
      AuthService.dummyBcryptHashCache = bcrypt.hashSync(
        'unused-dummy-for-timing-equalization-do-not-use',
        10,
      );
    }
    return AuthService.dummyBcryptHashCache;
  }

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrgRepository: Repository<UserOrganization>,
    @InjectRepository(AuthSession)
    private authSessionRepository: Repository<AuthSession>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    private jwtService: JwtService,
    private dataSource: DataSource,
    private readonly emailService: EmailService,
    @Optional()
    @Inject(AUTH_RATE_LIMIT_STORE)
    private readonly rateLimitStore: AuthRateLimitStore | null,
    @Optional()
    private readonly auditService?: AuditService,
    @Optional()
    private readonly orgProvisioningService?: OrgProvisioningService,
    @Optional()
    @Inject(IDENTITY_EVENT_BUS)
    private readonly identityEventBus?: IdentityEventBus,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, firstName, lastName, organizationName } =
      signupDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Simple password validation
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Use transaction for consistency — creates org, user, session, userOrg atomically
    const txResult = await this.dataSource.transaction(async (manager) => {
      // Create organization
      const organization = manager.create(Organization, {
        name: organizationName,
        slug: organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        settings: {
          resourceManagement: {
            maxAllocationPercentage: 150,
            warningThreshold: 80,
            criticalThreshold: 100,
          },
        },
      });
      const savedOrg = await manager.save(organization);

      // Create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = manager.create(User, {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        organizationId: savedOrg.id,
        isEmailVerified: true, // Skip email verification for MVP
        role: 'admin', // First user is admin
      });
      const savedUser = await manager.save(user);

      // Generate JWT tokens
      const accessToken = await this.generateToken(savedUser);

      // Create session first to get sessionId for refresh token
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days

      const session = manager.create(AuthSession, {
        userId: savedUser.id,
        organizationId: savedOrg.id,
        userAgent: null,
        ipAddress: null,
        currentRefreshTokenHash: null,
        refreshExpiresAt,
      });
      const savedSession = await manager.save(session);

      const refreshToken = await this.generateRefreshToken(
        savedUser,
        savedSession.id,
      );
      const finalRefreshTokenHash =
        TokenHashUtil.hashRefreshToken(refreshToken);
      savedSession.currentRefreshTokenHash = finalRefreshTokenHash;
      await manager.save(savedSession);

      // Create UserOrganization record for the first user (admin)
      const userOrg = manager.create(UserOrganization, {
        userId: savedUser.id,
        organizationId: savedOrg.id,
        role: 'admin',
        isActive: true,
      });
      await manager.save(userOrg);

      const userResponse = this.buildUserResponse(savedUser, 'admin', savedOrg);

      return {
        user: userResponse,
        accessToken,
        refreshToken,
        organizationId: savedOrg.id,
        orgName: savedOrg.name,
        userId: savedUser.id,
        userName: savedUser.firstName || savedUser.email,
        expiresIn: 900,
      };
    });

    // Post-signup provisioning — OUTSIDE the transaction so nested transactions
    // in OrgProvisioningService don't conflict with the signup transaction.
    if (this.orgProvisioningService) {
      try {
        await this.orgProvisioningService.provisionNewOrganization({
          organizationId: txResult.organizationId,
          userId: txResult.userId,
          userName: txResult.userName,
          organizationName: txResult.orgName,
        });
      } catch (err) {
        this.logger.warn(`Post-signup provisioning failed: ${(err as Error).message}`);
      }
    }

    return {
      user: txResult.user,
      accessToken: txResult.accessToken,
      refreshToken: txResult.refreshToken,
      organizationId: txResult.organizationId,
      expiresIn: txResult.expiresIn,
    };
  }

  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
    const { email, password } = loginDto;
    const emailHash = createHash('sha256')
      .update(email.toLowerCase().trim())
      .digest('hex')
      .slice(0, 16);

    // SEC-3: per-account brute-force throttle. peek() (read-only) BEFORE bcrypt
    // so a throttled account cannot be probed even with a correct password —
    // the window blocks the attack, not just the failures. The counter itself
    // is incremented only on failure below. Fails OPEN if Redis is down.
    const failKey = `auth:fail:${emailHash}`;
    const failStatus = await this.rateLimitStore?.peek(failKey);
    if (failStatus && failStatus.count >= AuthService.LOGIN_FAIL_RATE_LIMIT) {
      throw new HttpException(
        {
          message:
            'Too many failed login attempts for this account. Please try again later.',
          retryAfter:
            failStatus.ttlSeconds || AuthService.LOGIN_FAIL_RATE_WINDOW_SEC,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // ADR-008 (account enumeration prevention): equalize timing between
      // user-not-found (cheap DB miss) and wrong-password (~70-100ms bcrypt
      // verify) by running a dummy bcrypt.compare against a static hash.
      // The result is intentionally discarded. Without this, login latency
      // would betray account existence even though the response body and
      // status are identical for both cases. CI timing-parity test deferred
      // (see debt log S5).
      await bcrypt.compare(password, AuthService.getDummyBcryptHash());
      await this.rateLimitStore?.hit(
        failKey,
        AuthService.LOGIN_FAIL_RATE_WINDOW_SEC,
        AuthService.LOGIN_FAIL_RATE_LIMIT,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.rateLimitStore?.hit(
        failKey,
        AuthService.LOGIN_FAIL_RATE_WINDOW_SEC,
        AuthService.LOGIN_FAIL_RATE_LIMIT,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.ensureEmailVerificationAllowed(user);
    return this.createLoginResult(user, emailHash, ip, userAgent);
  }

  async smokeLogin(email: string, ip?: string, userAgent?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = createHash('sha256')
      .update(normalizedEmail)
      .digest('hex')
      .slice(0, 16);

    if (!shouldBypassEmailVerificationForEmail(normalizedEmail)) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message:
          'Smoke login requires staging bypass allowlist and enabled skip flag.',
        email: normalizedEmail,
      });
    }

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (!user) {
      // Smoke login is an allowlisted staging-fixture path (requires the smoke
      // key), not a credential-stuffing surface, so it is not peek-throttled at
      // entry. Counter kept for parity/visibility with real limits (SEC-3).
      await this.rateLimitStore?.hit(
        `auth:fail:${emailHash}`,
        AuthService.LOGIN_FAIL_RATE_WINDOW_SEC,
        AuthService.LOGIN_FAIL_RATE_LIMIT,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.ensureEmailVerificationAllowed(user);
    return this.createLoginResult(user, emailHash, ip, userAgent);
  }

  /**
   * Completes login after Passport Google validates profile (cookies set by controller).
   */
  async completeOAuthLogin(user: User, ip?: string, userAgent?: string) {
    const emailHash = createHash('sha256')
      .update(user.email.toLowerCase().trim())
      .digest('hex')
      .slice(0, 16);
    await this.ensureEmailVerificationAllowed(user);
    return this.createLoginResult(user, emailHash, ip, userAgent);
  }

  /**
   * Resolve user for Google OAuth: existing linked account, conflicts, or provision new org+user.
   */
  async syncGoogleOAuthProfile(
    input: GoogleOAuthProfileInput,
  ): Promise<User> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const byGoogle = await this.userRepository.findOne({
      where: { googleId: input.googleId },
    });
    if (byGoogle) {
      return byGoogle;
    }

    const byEmail = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (byEmail) {
      if (!byEmail.googleId) {
        throw new ConflictException({
          code: 'ACCOUNT_EXISTS_PASSWORD',
          message:
            'An account with this email already exists. Sign in with email and password.',
        });
      }
      if (byEmail.googleId !== input.googleId) {
        this.logger.warn({
          action: 'GOOGLE_OAUTH_ACCOUNT_CONFLICT',
          email: normalizedEmail,
          message: 'Email associated with different Google account',
        });
        throw new ConflictException({
          code: 'GOOGLE_ACCOUNT_MISMATCH',
          message:
            'This email is associated with a different account; contact support.',
        });
      }
      return byEmail;
    }

    const skipEmailVerification =
      shouldBypassEmailVerificationForEmail(normalizedEmail) ||
      input.emailVerifiedFromGoogle;

    let orgDisplayName =
      input.displayName.trim().length >= 2
        ? `${input.displayName.trim()}'s Organization`
        : `${(normalizedEmail.split('@')[0] || 'user').trim()}'s Organization`;
    orgDisplayName = orgDisplayName.slice(0, 80);
    if (orgDisplayName.trim().length < 2) {
      orgDisplayName = `${normalizedEmail.split('@')[0] || 'user'} Org`.slice(
        0,
        80,
      );
    }

    let slugBase = slugify(orgDisplayName);
    if (!slugBase) {
      slugBase = slugify(normalizedEmail.split('@')[0] || 'org') || 'org';
    }
    const slugValidation = validateOrgSlug(slugBase);
    if (!slugValidation.valid) {
      slugBase = slugify(normalizedEmail.split('@')[0] || 'org') || 'org';
    }

    const placeholderPassword = await bcrypt.hash(
      randomBytes(32).toString('hex'),
      12,
    );

    let firstName =
      input.givenName?.trim() ||
      input.displayName.trim().split(/\s+/)[0] ||
      normalizedEmail.split('@')[0] ||
      'User';
    let lastName =
      input.familyName?.trim() ||
      input.displayName.trim().split(/\s+/).slice(1).join(' ') ||
      '';
    firstName = firstName.slice(0, 100);
    lastName = lastName.slice(0, 100);

    const requestId = `google-oauth-${Date.now()}-${randomBytes(4).toString('hex')}`;

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const orgRepo = manager.getRepository(Organization);
        const userOrgRepo = manager.getRepository(UserOrganization);
        const tokenRepo = manager.getRepository(EmailVerificationToken);
        const outboxRepo = manager.getRepository(AuthOutbox);

        const checkSlugExists = async (slug: string): Promise<boolean> => {
          const existing = await orgRepo.findOne({ where: { slug } });
          return !!existing;
        };

        const availableSlug = await generateAvailableSlug(
          slugBase,
          checkSlugExists,
          10,
        );

        const organization = orgRepo.create({
          name: orgDisplayName.trim(),
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

        const user = userRepo.create({
          email: normalizedEmail,
          password: placeholderPassword,
          googleId: input.googleId,
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

        let verificationTokenId: string | null = null;
        let expiresAt: Date | null = null;

        if (!skipEmailVerification) {
          const rawToken = TokenHashUtil.generateRawToken();
          const tokenHash = TokenHashUtil.hashToken(rawToken);
          expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);

          const verificationToken = tokenRepo.create({
            userId: savedUser.id,
            tokenHash,
            expiresAt,
            ip: null,
            userAgent: null,
          });
          await tokenRepo.save(verificationToken);
          verificationTokenId = verificationToken.id;

          const outboxEvent = outboxRepo.create({
            type: 'auth.email_verification.requested',
            payloadJson: {
              userId: savedUser.id,
              email: normalizedEmail,
              token: rawToken,
              fullName: `${firstName} ${lastName}`.trim(),
              orgName: savedOrg.name,
            },
            status: 'pending',
            attempts: 0,
          });
          await outboxRepo.save(outboxEvent);
        }

        return {
          savedOrg,
          savedUser,
          verificationTokenId,
          expiresAt,
          skipEmailVerification,
          firstName,
          lastName,
        };
      });

      const auditCtx = {
        organizationId: result.savedOrg.id,
        actorUserId: result.savedUser.id,
        actorPlatformRole: PlatformRole.ADMIN,
        ipAddress: undefined as string | undefined,
        userAgent: undefined as string | undefined,
      };

      await this.auditService?.record({
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
          source: 'google_oauth',
        },
      });

      await this.auditService?.record({
        ...auditCtx,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: result.savedOrg.id,
        action: AuditAction.ORG_CREATED,
        after: {
          name: result.savedOrg.name,
          slug: result.savedOrg.slug,
          status: result.savedOrg.status,
          source: 'google_oauth',
        },
      });

      if (
        !result.skipEmailVerification &&
        result.verificationTokenId &&
        result.expiresAt
      ) {
        await this.auditService?.record({
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

      try {
        await this.orgProvisioningService?.provisionNewOrganization({
          organizationId: result.savedOrg.id,
          userId: result.savedUser.id,
          userName: result.firstName || normalizedEmail,
          organizationName: result.savedOrg.name,
        });
      } catch (provErr) {
        this.logger.warn(
          `Google OAuth post-signup provisioning failed: ${(provErr as Error).message}`,
        );
      }

      return result.savedUser;
    } catch (error: unknown) {
      const err = error as { code?: string; driverError?: { code?: string } };
      const errorCode = String(err?.code ?? err?.driverError?.code ?? '');
      const isUniqueViolation = errorCode === '23505';

      if (isUniqueViolation || error instanceof QueryFailedError) {
        this.logger.warn(
          `Google OAuth registration race for ${normalizedEmail}, requestId: ${requestId}`,
        );
        const bySub = await this.userRepository.findOne({
          where: { googleId: input.googleId },
        });
        if (bySub) {
          return bySub;
        }
        const byMail = await this.userRepository.findOne({
          where: { email: normalizedEmail },
        });
        if (byMail?.googleId === input.googleId) {
          return byMail;
        }
      }
      throw error;
    }
  }

  private async ensureEmailVerificationAllowed(user: User): Promise<void> {
    const bypassVerification = shouldBypassEmailVerificationForEmail(user.email);
    if (bypassVerification && !user.isEmailVerified) {
      const verifiedAt = new Date();
      await this.userRepository.update(user.id, {
        isEmailVerified: true,
        emailVerifiedAt: verifiedAt,
      });
      user.isEmailVerified = true;
      user.emailVerifiedAt = verifiedAt;

      if (this.auditService && user.organizationId) {
        await this.auditService.record({
          organizationId: user.organizationId,
          actorUserId: user.id,
          actorPlatformRole: user.role || 'ADMIN',
          entityType: AuditEntityType.EMAIL_VERIFICATION,
          entityId: user.id,
          action: AuditAction.EMAIL_VERIFICATION_BYPASSED,
          metadata: {
            source: 'staging_email_bypass',
            trigger: 'login',
            reason: 'staging_bypass',
            allowlistedDomain: true,
            emailDomain: user.email.split('@').pop()?.toLowerCase() || '',
          },
        });
      }
    }

    if (!bypassVerification && !user.isEmailVerified && !user.emailVerifiedAt) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        email: user.email,
      });
    }
  }

  private async createLoginResult(
    user: User,
    emailHash: string,
    ip?: string,
    userAgent?: string,
  ) {
    if (!user.organizationId) {
      this.logger.error(
        `Login blocked: user ${user.id} has no organization_id (email=${user.email})`,
      );
      throw new BadRequestException({
        code: 'USER_MISSING_ORGANIZATION',
        message:
          'This account is not linked to an organization. Use a complete signup flow or contact support.',
      });
    }

    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    // Generate JWT tokens
    const accessToken = await this.generateToken(user);

    // Feature 2B: Create auth session first to get sessionId
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days

    const session = this.authSessionRepository.create({
      userId: user.id,
      organizationId: user.organizationId,
      userAgent: userAgent || null,
      ipAddress: ip || null,
      currentRefreshTokenHash: null, // Will be set after token generation
      refreshExpiresAt,
    });
    const savedSession = await this.authSessionRepository.save(session);

    // Generate refresh token with sessionId in payload
    const refreshToken = await this.generateRefreshToken(user, savedSession.id);
    const refreshTokenHash = TokenHashUtil.hashRefreshToken(refreshToken);
    savedSession.currentRefreshTokenHash = refreshTokenHash;
    await this.authSessionRepository.save(savedSession);

    // Get UserOrganization role if available
    let orgRole: string | null = null;
    let organization: Organization | null = null;
    if (user.organizationId) {
      const userOrg = await this.userOrgRepository.findOne({
        where: {
          userId: user.id,
          organizationId: user.organizationId,
          isActive: true,
        },
      });
      if (userOrg) {
        orgRole = userOrg.role;
      }

      // Load organization to get features
      organization = await this.organizationRepository.findOne({
        where: { id: user.organizationId },
      });
    }

    // Build complete user response with permissions
    // Pass the org role and organization explicitly
    const userResponse = this.buildUserResponse(user, orgRole, organization);

    // Get default workspace slug (most recently used, or earliest created)
    let defaultWorkspaceSlug: string | null = null;
    if (user.organizationId) {
      try {
        // Try to get most recently accessed workspace (if we track lastWorkspaceId)
        // For now, get the earliest created workspace as default
        const defaultWorkspace = await this.workspaceRepository.findOne({
          where: {
            organizationId: user.organizationId,
            deletedAt: null,
          },
          order: {
            createdAt: 'ASC', // Earliest created
          },
        });
        if (defaultWorkspace?.slug) {
          defaultWorkspaceSlug = defaultWorkspace.slug;
        }
      } catch (error) {
        // Silently fail - defaultWorkspaceSlug will be null
        console.warn('Failed to get default workspace:', error);
      }
    }

    // Optional store: no-op store means auth remains allowed if not configured.
    await this.rateLimitStore?.hit(`auth:success:${emailHash}`, 60, 1_000_000);

    return {
      user: userResponse,
      accessToken,
      refreshToken,
      sessionId: savedSession.id,
      organizationId: user.organizationId,
      defaultWorkspaceSlug,
      expiresIn: 900,
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async generateToken(user: User): Promise<string> {
    // Get platform role from UserOrganization if available, otherwise normalize user.role
    let platformRole: PlatformRole = normalizePlatformRole(user.role);

    if (user.organizationId) {
      const userOrg = await this.userOrgRepository.findOne({
        where: {
          userId: user.id,
          organizationId: user.organizationId,
          isActive: true,
        },
      });
      if (userOrg) {
        // Map UserOrganization role to PlatformRole
        platformRole = normalizePlatformRole(userOrg.role);
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role, // Keep for backward compatibility
      platformRole: platformRole, // Normalized platform role
    };

    // Use config service for expiration, with dev-friendly default
    const expiresIn =
      process.env.NODE_ENV === 'development'
        ? process.env.JWT_EXPIRES_IN || '7d' // 7 days for dev testing
        : process.env.JWT_EXPIRES_IN || '15m'; // 15 minutes for production

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set. Cannot sign tokens.');
    }

    return this.jwtService.sign(payload, { secret, expiresIn });
  }

  private async generateRefreshToken(
    user: User,
    sessionId?: string,
  ): Promise<string> {
    // Get platform role from UserOrganization if available, otherwise normalize user.role
    let platformRole: PlatformRole = normalizePlatformRole(user.role);

    if (user.organizationId) {
      const userOrg = await this.userOrgRepository.findOne({
        where: {
          userId: user.id,
          organizationId: user.organizationId,
          isActive: true,
        },
      });
      if (userOrg) {
        platformRole = normalizePlatformRole(userOrg.role);
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role, // Keep for backward compatibility
      platformRole: platformRole, // Normalized platform role
      sid: sessionId, // Session ID for binding
    };

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not set. Cannot sign refresh tokens.');
    }

    return this.jwtService.sign(payload, { secret: refreshSecret, expiresIn: '7d' });
  }

  sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Build complete user object with permissions for API responses
   * Used by both login and /auth/me to ensure consistent structure
   *
   * @param user - User entity from database
   * @param orgRoleFromUserOrg - Optional role from UserOrganization ('owner' | 'admin' | 'member' | 'viewer')
   *                             If provided, this takes precedence over user.role
   */
  public buildUserResponse(
    user: User,
    orgRoleFromUserOrg?: string | null,
    organization?: Organization | null,
  ): any {
    // Resolve platform role:
    // 1. If orgRoleFromUserOrg provided, use it (from UserOrganization)
    // 2. Otherwise fall back to user.role
    let platformRole: PlatformRole;

    if (orgRoleFromUserOrg) {
      // Map UserOrganization role to PlatformRole
      if (orgRoleFromUserOrg === 'admin' || orgRoleFromUserOrg === 'owner') {
        platformRole = PlatformRole.ADMIN;
      } else if (
        orgRoleFromUserOrg === 'pm' ||
        orgRoleFromUserOrg === 'member'
      ) {
        platformRole = PlatformRole.MEMBER;
      } else if (orgRoleFromUserOrg === 'viewer') {
        platformRole = PlatformRole.VIEWER;
      } else {
        // Fallback to normalization
        platformRole = normalizePlatformRole(orgRoleFromUserOrg);
      }
    } else {
      // Fallback to user.role with normalization
      platformRole = normalizePlatformRole(user.role);
    }

    // Determine admin status explicitly from org role
    // This is the single source of truth for permissions.isAdmin
    // Contract: Admin status comes from UserOrganization.role only
    const isOrgAdmin =
      orgRoleFromUserOrg === 'admin' || orgRoleFromUserOrg === 'owner';
    // For now, no platform super admin - can be added later if needed
    const isPlatformSuperAdmin = false;

    if (process.env.NODE_ENV === 'development') {
      console.log('[buildUserResponse] admin check:', {
        userId: user.id,
        orgRole: orgRoleFromUserOrg,
        isOrgAdmin,
        finalIsAdmin: isOrgAdmin || isPlatformSuperAdmin,
      });
    }

    // Build permissions object - isAdmin is the contract frontend depends on
    const permissions = {
      isAdmin: isOrgAdmin || isPlatformSuperAdmin,
      canManageUsers: isOrgAdmin || isPlatformSuperAdmin,
      canViewProjects: true, // All authenticated users can view projects
      canManageResources:
        platformRole === PlatformRole.ADMIN ||
        platformRole === PlatformRole.MEMBER,
      canViewAnalytics: true, // All authenticated users can view analytics
    };

    // Sanitize user (remove password)
    const sanitized = this.sanitizeUser(user);

    // Extract organization features from settings
    // Default to empty object if no organization or no features in settings
    const features =
      organization?.settings && typeof organization.settings === 'object'
        ? (organization.settings as any).features || {}
        : {};

    // Return consistent structure
    return {
      ...sanitized,
      role: platformRole, // Normalized platform role (enum string: 'ADMIN', 'MEMBER', 'VIEWER')
      platformRole, // Explicit platformRole field (same value)
      permissions,
      organizationId: user.organizationId,
      emailVerified: user.isEmailVerified || !!user.emailVerifiedAt, // Explicit boolean for frontend
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            features, // Organization feature flags (e.g., enableProgramsPortfolios)
          }
        : null,
    };
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        // Don't use select - return all fields except password (sanitized later)
      });
      return user;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });
      return user;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  async refreshToken(
    refreshToken: string,
    sessionId: string | null,
    ip: string,
    userAgent: string,
  ) {
    try {
      // Decode the refresh token to get user ID and sessionId
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const user = await this.getUserById(decoded.sub);

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Extract sid from token payload (preferred) or use provided sessionId
      const tokenSessionId = decoded.sid || sessionId;

      if (!tokenSessionId) {
        throw new UnauthorizedException('Session ID required');
      }

      // Load session by sid from token
      const session = await this.authSessionRepository.findOne({
        where: { id: tokenSessionId, userId: user.id },
      });

      if (!session) {
        throw new UnauthorizedException('Session not found');
      }

      // ADR-002 family reuse-detection: if the presented token corresponds to
      // a session that has already been rotated (replaced_at IS NOT NULL),
      // this is a theft signal — invalidate every still-active session in the
      // family and require re-authentication. Sibling families on other
      // devices are unaffected because each initial login creates its own
      // family_id. 1-second idempotency window for legitimate race conditions
      // is debt (revisit when client retry semantics surface as an issue).
      if (session.replacedAt !== null) {
        const invalidateResult = await this.authSessionRepository
          .createQueryBuilder()
          .update(AuthSession)
          .set({
            revokedAt: new Date(),
            revokeReason: 'token_reuse_detected',
            currentRefreshTokenHash: null,
          })
          .where('family_id = :familyId', { familyId: session.familyId })
          .andWhere('revoked_at IS NULL')
          .execute();

        await this.identityEventBus?.publish({
          type: 'auth.token_refresh_reuse_detected',
          occurredAt: new Date(),
          organizationId: session.organizationId,
          actorUserId: user.id,
          userId: user.id,
          familyId: session.familyId,
          invalidatedSessionCount: invalidateResult.affected ?? 0,
          ipAddress: ip || null,
          userAgent: userAgent || null,
        });

        this.logger.warn(
          `Refresh token reuse detected: userId=${user.id} family=${session.familyId} invalidated=${invalidateResult.affected ?? 0}`,
        );

        throw new UnauthorizedException({
          code: 'REFRESH_TOKEN_REUSE_DETECTED',
          message:
            'Refresh token reuse detected. Re-authentication required.',
        });
      }

      if (session.isRevoked()) {
        throw new UnauthorizedException('Session has been revoked');
      }

      if (session.isExpired()) {
        throw new UnauthorizedException('Session has expired');
      }

      // Verify refresh token hash matches
      if (
        session.currentRefreshTokenHash &&
        !TokenHashUtil.verifyRefreshToken(
          refreshToken,
          session.currentRefreshTokenHash,
        )
      ) {
        throw new UnauthorizedException('Invalid refresh token for session');
      }

      // ADR-002 new-row family rotation: each refresh creates a new
      // auth_sessions row in the same family. Mark the old row as replaced
      // and link the two via parent_session_id / replaced_by_session_id so
      // future presentations of the OLD token hit the reuse-detection branch
      // above. Old row's currentRefreshTokenHash is preserved so the lookup
      // path can still find the right session by hash if needed.
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

      const newSession = await this.dataSource.transaction(async (manager) => {
        const sessionRepo = manager.getRepository(AuthSession);

        const created = sessionRepo.create({
          userId: user.id,
          organizationId: session.organizationId,
          familyId: session.familyId,
          parentSessionId: session.id,
          userAgent: userAgent || session.userAgent,
          ipAddress: ip || session.ipAddress,
          refreshExpiresAt,
          currentRefreshTokenHash: null, // populated after token generation
          lastSeenAt: new Date(),
        });
        const saved = await sessionRepo.save(created);

        await sessionRepo.update(session.id, {
          replacedAt: new Date(),
          replacedBySessionId: saved.id,
        });

        return saved;
      });

      // Generate tokens bound to the NEW session id
      const newRefreshToken = await this.generateRefreshToken(
        user,
        newSession.id,
      );
      const newRefreshTokenHash =
        TokenHashUtil.hashRefreshToken(newRefreshToken);

      await this.authSessionRepository.update(newSession.id, {
        currentRefreshTokenHash: newRefreshTokenHash,
      });

      const accessToken = await this.generateToken(user);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        sessionId: newSession.id,
        expiresIn: 900, // 15 minutes in seconds
      };
    } catch (error) {
      // Preserve structured UnauthorizedException (e.g. REFRESH_TOKEN_REUSE_DETECTED)
      // so the client can act on the specific code. Generic catch-all stays as the
      // safe default for unexpected errors.
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn('Refresh token failed (unexpected)', {
        message: (error as Error)?.message,
      });
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(
    userId: string,
    sessionId?: string,
    refreshToken?: string,
  ): Promise<void> {
    // Feature 2B: Revoke session server-side
    let targetSessionId = sessionId;

    // If no sessionId provided, try to extract from refresh token
    if (!targetSessionId && refreshToken) {
      try {
        const decoded = this.jwtService.verify(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET,
        });
        targetSessionId = decoded.sid;
      } catch (error) {
        this.logger.warn('Logout with invalid refresh token', { userId });
      }
    }

    if (targetSessionId) {
      const session = await this.authSessionRepository.findOne({
        where: { id: targetSessionId, userId },
      });

      if (session && !session.isRevoked()) {
        session.revokedAt = new Date();
        session.revokeReason = 'user_logout';
        session.currentRefreshTokenHash = null; // Clear token hash to prevent reuse
        await this.authSessionRepository.save(session);
      }
    } else {
      this.logger.warn('Logout without sessionId', { userId });
    }

    return;
  }

  /**
   * Account profile for settings UI (subset of fields; no password).
   */
  async getUserAccountProfile(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let orgRole: string | null = null;
    let organization: Organization | null = null;
    if (user.organizationId) {
      const userOrg = await this.userOrgRepository.findOne({
        where: {
          userId: user.id,
          organizationId: user.organizationId,
          isActive: true,
        },
      });
      if (userOrg) {
        orgRole = userOrg.role;
      }
      organization = await this.organizationRepository.findOne({
        where: { id: user.organizationId },
      });
    }

    const built = this.buildUserResponse(user, orgRole, organization);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      platformRole: built.platformRole,
      organizationName: organization?.name ?? null,
      isEmailVerified: !!(user.isEmailVerified || user.emailVerifiedAt),
      createdAt: user.createdAt,
    };
  }

  async updateUserAccountProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }
    if (dto.profilePicture !== undefined) {
      user.profilePicture = dto.profilePicture;
    }

    await this.userRepository.save(user);
    return this.getUserAccountProfile(userId);
  }

  async changeUserPassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    await this.dataSource.transaction(async (manager) => {
      await this.revokeAllAuthSessionsForUser(
        manager,
        userId,
        'password_change',
      );
    });
    await this.revokeLegacyRefreshTokensForUser(userId);

    return { message: 'Password updated successfully' };
  }

  /**
   * Revoke all active auth_sessions rows for a user (password reset or in-app change).
   */
  private async revokeAllAuthSessionsForUser(
    manager: EntityManager,
    userId: string,
    revokeReason: 'password_reset' | 'password_change',
  ): Promise<void> {
    const sessionRepo = manager.getRepository(AuthSession);
    await sessionRepo
      .createQueryBuilder()
      .update(AuthSession)
      .set({
        revokedAt: new Date(),
        revokeReason,
        currentRefreshTokenHash: null,
      })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  private async revokeLegacyRefreshTokensForUser(userId: string): Promise<void> {
    try {
      await this.refreshTokenRepository.update(
        { user_id: userId, revoked: false },
        { revoked: true },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        'Legacy refresh_tokens revocation skipped (table missing or schema mismatch)',
        { userId, error: message },
      );
    }
  }

  private static readonly PASSWORD_RESET_EMAIL_RATE_WINDOW_SEC = 15 * 60;
  private static readonly PASSWORD_RESET_EMAIL_RATE_LIMIT = 3;

  /**
   * SEC-3 (Ruling B) — per-account credential-stuffing throttle: 10 failed
   * logins / 15 min per account → 429 with Retry-After. THROTTLE, not soft-lock:
   * soft-locking an account on failed passwords lets anyone who knows a victim's
   * email lock them out (a DoS against the victim). Throttling makes the attacker
   * wait without weaponizing the defense. The per-IP layer fires first for
   * single-source attacks; this per-account layer catches the rotating-IP case.
   * Enforced by a peek() at login ENTRY (before bcrypt) so a throttled account
   * cannot be probed even with a correct password.
   */
  private static readonly LOGIN_FAIL_RATE_WINDOW_SEC = 15 * 60;
  private static readonly LOGIN_FAIL_RATE_LIMIT = 10;

  /**
   * Initiate password reset. Neutral to callers (no enumeration).
   * Per-email rate limit: 3 / 15 minutes when AUTH_RATE_LIMIT_STORE is configured.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    if (this.rateLimitStore) {
      const emailKey = createHash('sha256')
        .update(normalizedEmail)
        .digest('hex');
      const key = `pwd_reset_email:${emailKey}`;
      const hit = await this.rateLimitStore.hit(
        key,
        AuthService.PASSWORD_RESET_EMAIL_RATE_WINDOW_SEC,
        AuthService.PASSWORD_RESET_EMAIL_RATE_LIMIT,
      );
      if (!hit.allowed) {
        throw new HttpException(
          {
            message: 'Too many password reset requests for this email. Please try again later.',
            retryAfter: AuthService.PASSWORD_RESET_EMAIL_RATE_WINDOW_SEC,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (!user) {
      return;
    }

    if (!this.emailService.isSendGridConfigured()) {
      throw new AppException(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Password reset email cannot be sent right now. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const rawToken = TokenHashUtil.generateRawToken();
    const tokenHash = TokenHashUtil.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const tokenId = await this.dataSource.transaction(async (manager) => {
      const tokenRepo = manager.getRepository(PasswordResetToken);
      await tokenRepo.update(
        { userId: user.id, consumed: false },
        { consumed: true, consumedAt: new Date() },
      );

      const row = tokenRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        consumed: false,
        consumedAt: null,
      });
      const saved = await tokenRepo.save(row);
      return saved.id;
    });

    try {
      await this.emailService.sendPasswordResetEmail(user.email, rawToken);

      if (this.auditService && user.organizationId) {
        await this.auditService.record({
          organizationId: user.organizationId,
          actorUserId: user.id,
          actorPlatformRole: 'ADMIN',
          entityType: AuditEntityType.PASSWORD_RESET,
          entityId: user.id,
          action: AuditAction.PASSWORD_RESET_REQUESTED,
          after: {},
          ipAddress: undefined,
          userAgent: undefined,
        });
      }

      this.logger.log({
        action: AuditAction.PASSWORD_RESET_REQUESTED,
        userId: user.id,
      });
    } catch (error: unknown) {
      console.error(
        'Password reset email failed after token persisted; compensating delete',
        error,
      );
      await this.passwordResetTokenRepository.delete({ id: tokenId });
    }
  }

  /**
   * AUTH-1: admin-initiated password reset link (no email dependency).
   *
   * Generates the SAME one-time, 1-hour reset token as the self-serve flow but
   * returns the reset link directly to the calling admin to hand over — so a
   * tester/design partner who is locked out can be recovered while SendGrid is
   * dormant. The returned link is compatible with resetPasswordWithToken(). No
   * SendGrid check and no email are involved, so the standing "forgot-password
   * 503s when SendGrid is dormant" behavior is unchanged; when SendGrid wakes
   * up this same path can additionally deliver the link by email.
   *
   * Org-scoped: the admin may only reset users in their OWN organization.
   * Audited: PASSWORD_RESET_LINK_GENERATED with the admin as actor.
   */
  async adminGenerateResetLink(
    targetUserId: string,
    actor: { userId: string; organizationId: string },
  ): Promise<{ resetLink: string; expiresAt: Date; userId: string }> {
    const target = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    // Org isolation: never mint a reset token for a user outside the admin's org.
    if (
      !target.organizationId ||
      target.organizationId !== actor.organizationId
    ) {
      throw new ForbiddenException(
        'Cannot generate a reset link for a user outside your organization',
      );
    }

    const rawToken = TokenHashUtil.generateRawToken();
    const tokenHash = TokenHashUtil.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.dataSource.transaction(async (manager) => {
      const tokenRepo = manager.getRepository(PasswordResetToken);
      // Invalidate any outstanding tokens so only the newest link works.
      await tokenRepo.update(
        { userId: target.id, consumed: false },
        { consumed: true, consumedAt: new Date() },
      );
      const row = tokenRepo.create({
        userId: target.id,
        tokenHash,
        expiresAt,
        consumed: false,
        consumedAt: null,
      });
      await tokenRepo.save(row);
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

    if (this.auditService) {
      await this.auditService.record({
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        actorPlatformRole: 'ADMIN',
        entityType: AuditEntityType.PASSWORD_RESET,
        entityId: target.id,
        action: AuditAction.PASSWORD_RESET_LINK_GENERATED,
        after: {},
        ipAddress: undefined,
        userAgent: undefined,
      });
    }

    return { resetLink, expiresAt, userId: target.id };
  }

  /**
   * Complete password reset; revokes all auth sessions for the user.
   */
  async resetPasswordWithToken(rawToken: string, newPassword: string): Promise<void> {
    const trimmed = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!trimmed) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const tokenHash = TokenHashUtil.hashToken(trimmed);

    let auditUserId: string | null = null;
    let auditOrganizationId: string | null = null;
    let notifyEmail: string | null = null;
    let notifyDisplayName: string | undefined;

    await this.dataSource.transaction(async (manager) => {
      const tokenRepo = manager.getRepository(PasswordResetToken);
      const userRepo = manager.getRepository(User);

      const row = await tokenRepo.findOne({
        where: { tokenHash },
        relations: ['user'],
      });

      if (!row || row.consumed || row.isExpired()) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      const user = row.user;
      if (!user) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      auditUserId = user.id;
      auditOrganizationId = user.organizationId ?? null;
      notifyEmail = user.email;
      notifyDisplayName =
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
        undefined;

      user.password = await bcrypt.hash(newPassword, 10);
      await userRepo.save(user);

      row.consumed = true;
      row.consumedAt = new Date();
      await tokenRepo.save(row);

      await this.revokeAllAuthSessionsForUser(manager, user.id, 'password_reset');
    });

    if (auditUserId) {
      await this.revokeLegacyRefreshTokensForUser(auditUserId);
    }

    if (this.auditService && auditUserId && auditOrganizationId) {
      await this.auditService.record({
        organizationId: auditOrganizationId,
        actorUserId: auditUserId,
        actorPlatformRole: 'ADMIN',
        entityType: AuditEntityType.PASSWORD_RESET,
        entityId: auditUserId,
        action: AuditAction.PASSWORD_RESET_COMPLETED,
        after: {},
        ipAddress: undefined,
        userAgent: undefined,
      });
    }

    this.logger.log({
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      userId: auditUserId,
    });

    if (notifyEmail) {
      try {
        await this.emailService.sendPasswordChangedNotification(
          notifyEmail,
          notifyDisplayName,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error('Failed to send password changed notification', {
          userId: auditUserId,
          error: message,
        });
      }
    }
  }
}
