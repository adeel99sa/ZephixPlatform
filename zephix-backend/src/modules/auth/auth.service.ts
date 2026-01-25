/**
 * ROLE MAPPING SUMMARY:
 * - Database layer: UserOrganization.role = 'owner' | 'admin' | 'pm' | 'viewer'
 * - Database layer: User.role = legacy string (e.g., 'admin', 'pm', 'viewer')
 * - API responses: role = 'ADMIN' | 'MEMBER' | 'VIEWER' (normalized PlatformRole)
 * - API responses: platformRole = same as role (explicit enum field)
 * - API responses: permissions.isAdmin = true only for ADMIN platformRole
 */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity'; // Fixed path
import { Organization } from '../../organizations/entities/organization.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { AuthSession } from './entities/auth-session.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../shared/enums/platform-roles.enum';
import { TokenHashUtil } from '../../common/security/token-hash.util';

@Injectable()
export class AuthService implements OnModuleInit {
  private accessTokenExpiresInMs: number;
  private refreshTokenExpiresInMs: number;
  private accessTokenExpiresInStr: string;
  private refreshTokenExpiresInStr: string;
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrgRepository: Repository<UserOrganization>,
    @InjectRepository(AuthSession)
    private authSessionRepository: Repository<AuthSession>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  /**
   * Validate JWT config at startup - fail fast if missing or invalid
   */
  onModuleInit() {
    // Validate and store access token expiration
    const expiresIn = this.configService.get<string>('jwt.expiresIn');
    if (!expiresIn) {
      throw new Error(
        'jwt.expiresIn is required in config (config key: jwt.expiresIn, env var: JWT_EXPIRES_IN) but was not found.',
      );
    }
    this.validateDurationFormat(expiresIn, 'jwt.expiresIn');
    this.accessTokenExpiresInStr = expiresIn.trim();
    this.accessTokenExpiresInMs = this.parseDurationToMs(expiresIn);

    // Validate and store refresh token expiration
    const refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
    );
    if (!refreshExpiresIn) {
      throw new Error(
        'jwt.refreshExpiresIn is required in config (config key: jwt.refreshExpiresIn, env var: JWT_REFRESH_EXPIRES_IN) but was not found.',
      );
    }
    this.validateDurationFormat(refreshExpiresIn, 'jwt.refreshExpiresIn');
    this.refreshTokenExpiresInStr = refreshExpiresIn.trim();
    this.refreshTokenExpiresInMs = this.parseDurationToMs(refreshExpiresIn);

    // Validate and store JWT secrets
    const secret = this.configService.get<string>('jwt.secret');
    if (!secret || secret.trim().length === 0) {
      throw new Error(
        'jwt.secret is required in config (config key: jwt.secret, env var: JWT_SECRET) but was not found or empty.',
      );
    }
    this.jwtSecret = secret;

    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    if (!refreshSecret || refreshSecret.trim().length === 0) {
      throw new Error(
        'jwt.refreshSecret is required in config (config key: jwt.refreshSecret, env var: JWT_REFRESH_SECRET) but was not found or empty.',
      );
    }
    this.jwtRefreshSecret = refreshSecret;
  }

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

    // Use transaction for consistency
    return this.dataSource.transaction(async (manager) => {
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
      const refreshTokenHash = TokenHashUtil.hashRefreshToken('temp'); // Will be updated after token generation
      const now = new Date();
      const refreshExpiresAt = new Date(
        now.getTime() + this.refreshTokenExpiresInMs,
      );

      const session = manager.create(AuthSession, {
        userId: savedUser.id,
        organizationId: savedOrg.id,
        userAgent: null, // Signup doesn't have IP/userAgent yet
        ipAddress: null,
        currentRefreshTokenHash: null, // Will be set after token generation
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
        role: 'admin', // First user is admin
        isActive: true,
      });
      await manager.save(userOrg);

      // Build complete user response with permissions
      // Pass the org role explicitly
      // savedOrg is already available in the transaction scope
      const userResponse = this.buildUserResponse(savedUser, 'admin', savedOrg);

      // Calculate expiresIn in seconds from validated config
      const expiresInSeconds = Math.floor(this.accessTokenExpiresInMs / 1000);

      return {
        user: userResponse,
        accessToken,
        refreshToken,
        organizationId: savedOrg.id,
        expiresIn: expiresInSeconds,
      };
    });
  }

  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
    const { email, password } = loginDto;

    // Find user with organization
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    console.log(`[DEBUG] Comparing password for ${email}`);
    console.log(
      `[DEBUG] Stored hash: ${user.password ? user.password.substring(0, 20) + '...' : 'null'}`,
    );
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`[DEBUG] Password valid: ${isPasswordValid}`);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

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

    // Create session and tokens using shared method
    const { accessToken, refreshToken, sessionId, expiresIn } =
      await this.createSessionAndTokens(user, user.organizationId || '', {
        userAgent: userAgent || null,
        ipAddress: ip || null,
      });

    // Build complete user response with permissions
    // Pass the org role and organization explicitly
    const userResponse = this.buildUserResponse(user, orgRole, organization);

    return {
      user: userResponse,
      accessToken,
      refreshToken,
      sessionId,
      organizationId: user.organizationId,
      expiresIn,
    };
  }

  /**
   * Validate duration format with strict regex
   * Must match exactly: ^[1-9][0-9]*[dhms]$
   * Rejects decimals, trailing chars, leading zeros
   */
  private validateDurationFormat(value: string, configKey: string): void {
    const trimmed = value.trim();
    // Strict regex: starts with 1-9, followed by 0-9 digits, ends with d/h/m/s
    const durationRegex = /^[1-9][0-9]*[dhms]$/;
    if (!durationRegex.test(trimmed)) {
      throw new Error(
        `${configKey} must match format: ^[1-9][0-9]*[dhms]$ (e.g., '15m', '7d', '90s'). Got: ${value}. Decimals and trailing characters are not allowed.`,
      );
    }
  }

  /**
   * Parse validated duration string to milliseconds
   * Assumes format has already been validated
   */
  private parseDurationToMs(value: string): number {
    const trimmed = value.trim();
    let multiplier: number;
    let numericPart: string;

    if (trimmed.endsWith('d')) {
      multiplier = 24 * 60 * 60 * 1000; // days to ms
      numericPart = trimmed.slice(0, -1);
    } else if (trimmed.endsWith('h')) {
      multiplier = 60 * 60 * 1000; // hours to ms
      numericPart = trimmed.slice(0, -1);
    } else if (trimmed.endsWith('m')) {
      multiplier = 60 * 1000; // minutes to ms
      numericPart = trimmed.slice(0, -1);
    } else {
      // Must be 's' since format was validated
      multiplier = 1000; // seconds to ms
      numericPart = trimmed.slice(0, -1);
    }

    const num = parseInt(numericPart, 10);
    // No need to check NaN or <= 0 since regex ensures valid positive integer
    return num * multiplier;
  }

  /**
   * Shared method for creating auth session and tokens
   * Used by both login() and issueLoginForUser() to ensure consistency
   */
  private async createSessionAndTokens(
    user: User,
    organizationId: string,
    opts: { userAgent?: string | null; ipAddress?: string | null },
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    expiresIn: number;
  }> {
    // Generate JWT tokens
    const accessToken = await this.generateToken(user);

    // Calculate refresh expiration using validated config (single source of truth)
    const now = new Date();
    const refreshExpiresAt = new Date(
      now.getTime() + this.refreshTokenExpiresInMs,
    );

    const session = this.authSessionRepository.create({
      userId: user.id,
      organizationId: organizationId,
      userAgent: opts.userAgent || null,
      ipAddress: opts.ipAddress || null,
      currentRefreshTokenHash: null, // Will be set after token generation
      refreshExpiresAt,
    });
    const savedSession = await this.authSessionRepository.save(session);

    // Generate refresh token with sessionId in payload
    const refreshToken = await this.generateRefreshToken(user, savedSession.id);
    const refreshTokenHash = TokenHashUtil.hashRefreshToken(refreshToken);
    savedSession.currentRefreshTokenHash = refreshTokenHash;
    await this.authSessionRepository.save(savedSession);

    // Calculate expiresIn in seconds from validated config
    const expiresInSeconds = Math.floor(this.accessTokenExpiresInMs / 1000);

    return {
      accessToken,
      refreshToken,
      sessionId: savedSession.id,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Issue login tokens for a user after invite acceptance
   * Reuses the same token and session creation logic as login()
   *
   * @param userId - User ID to issue tokens for
   * @param organizationId - Organization ID (must match user's organizationId)
   * @param opts - Optional request metadata (userAgent, ipAddress)
   * @returns Auth payload identical to login response
   */
  async issueLoginForUser(
    userId: string,
    organizationId: string,
    opts?: { userAgent?: string | null; ipAddress?: string | null },
  ): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    organizationId: string;
    expiresIn: number;
  }> {
    // Load user by id
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Validate user is active
    if (!user.isActive) {
      throw new ForbiddenException({
        code: 'AUTH_USER_INACTIVE',
        message: 'User account is inactive',
      });
    }

    // Validate organizationId matches (treat mismatch as user not found for safety)
    if (user.organizationId !== organizationId) {
      throw new NotFoundException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Load organization
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException({
        code: 'AUTH_ORG_NOT_FOUND',
        message: 'Organization not found',
      });
    }

    // Resolve org role from UserOrganization (source of truth) - strict check
    const userOrg = await this.userOrgRepository.findOne({
      where: {
        userId: user.id,
        organizationId: organizationId,
        isActive: true,
      },
    });

    if (!userOrg) {
      throw new ForbiddenException({
        code: 'AUTH_ROLE_NOT_FOUND',
        message: 'User organization role not found',
      });
    }

    const orgRole = userOrg.role;

    // Create session and tokens using shared method
    const { accessToken, refreshToken, sessionId, expiresIn } =
      await this.createSessionAndTokens(user, organizationId, {
        userAgent: opts?.userAgent || null,
        ipAddress: opts?.ipAddress || null,
      });

    // Build complete user response with permissions (reuse existing helper)
    const userResponse = this.buildUserResponse(user, orgRole, organization);

    return {
      user: userResponse,
      accessToken,
      refreshToken,
      sessionId,
      organizationId: organizationId,
      expiresIn,
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

    // Use validated config string directly (no conversion needed)
    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.accessTokenExpiresInStr,
    });
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

    // Use validated config string directly (no conversion needed)
    return this.jwtService.sign(payload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.refreshTokenExpiresInStr,
    });
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
   * @param orgRoleFromUserOrg - Optional role from UserOrganization ('owner' | 'admin' | 'pm' | 'viewer')
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

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[buildUserResponse] admin check:', {
        email: user.email,
        orgRoleFromUserOrg,
        isOrgAdmin,
        isPlatformSuperAdmin,
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
        secret: this.jwtRefreshSecret,
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

      // Rotate refresh token (always rotate on refresh)
      const newRefreshToken = await this.generateRefreshToken(user, session.id);
      const newRefreshTokenHash =
        TokenHashUtil.hashRefreshToken(newRefreshToken);
      const now = new Date();
      const refreshExpiresAt = new Date(
        now.getTime() + this.refreshTokenExpiresInMs,
      );

      // Update session with new token hash and last seen
      // Throttle last_seen updates (only update if > 5 minutes since last update)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const shouldUpdateLastSeen = session.lastSeenAt < fiveMinutesAgo;

      session.currentRefreshTokenHash = newRefreshTokenHash;
      session.refreshExpiresAt = refreshExpiresAt;
      if (shouldUpdateLastSeen) {
        session.lastSeenAt = new Date();
      }
      await this.authSessionRepository.save(session);

      // Generate new access token
      const accessToken = await this.generateToken(user);

      // Calculate expiresIn in seconds from validated config
      const expiresInSeconds = Math.floor(this.accessTokenExpiresInMs / 1000);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        sessionId: session.id,
        expiresIn: expiresInSeconds,
      };

      // No fallback path - sessionId is required
    } catch (error) {
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
          secret: this.jwtRefreshSecret,
        });
        targetSessionId = decoded.sid;
      } catch (error) {
        // Invalid token - can't extract sessionId
        console.log(`User ${userId} logged out (invalid refresh token)`);
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
      // If no sessionId, log for audit but don't fail
      console.log(`User ${userId} logged out (no sessionId provided)`);
    }

    return;
  }
}
