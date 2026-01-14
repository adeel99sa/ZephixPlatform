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
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
export class AuthService {
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
    private dataSource: DataSource,
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
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days

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
      const userResponse = this.buildUserResponse(savedUser, 'admin');

      return {
        user: userResponse,
        accessToken,
        refreshToken,
        organizationId: savedOrg.id,
        expiresIn: 900, // 15 minutes in seconds
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

    // Generate JWT tokens
    const accessToken = await this.generateToken(user);

    // Feature 2B: Create auth session first to get sessionId
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days

    const session = this.authSessionRepository.create({
      userId: user.id,
      organizationId: user.organizationId || '',
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
    }

    // Build complete user response with permissions
    // Pass the org role explicitly
    const userResponse = this.buildUserResponse(user, orgRole);

    return {
      user: userResponse,
      accessToken,
      refreshToken,
      sessionId: savedSession.id, // Feature 2B: Return sessionId
      organizationId: user.organizationId,
      expiresIn: 900, // 15 minutes in seconds
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

    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      expiresIn: '15m',
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

    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      expiresIn: '7d',
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

    // Return consistent structure
    return {
      ...sanitized,
      role: platformRole, // Normalized platform role (enum string: 'ADMIN', 'MEMBER', 'VIEWER')
      platformRole, // Explicit platformRole field (same value)
      permissions,
      organizationId: user.organizationId,
      emailVerified: user.isEmailVerified || !!user.emailVerifiedAt, // Explicit boolean for frontend
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
        secret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
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
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days

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

      return {
        accessToken,
        refreshToken: newRefreshToken,
        sessionId: session.id,
        expiresIn: 900, // 15 minutes in seconds
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
          secret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
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
