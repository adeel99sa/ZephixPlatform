/**
 * ROLE MAPPING SUMMARY:
 * - /auth/me returns same shape as login: { role, platformRole, permissions }
 * - Both endpoints use buildUserResponse() helper for consistency
 * - Role resolution: UserOrganization.role (primary) → User.role (fallback)
 */
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Patch,
  Request,
  Response,
  Query,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { SmokeLoginDto } from './dto/smoke-login.dto';
import {
  ResendVerificationDto,
  ResendVerificationResponseDto,
} from './dto/resend-verification.dto';
import { VerifyEmailDto, VerifyEmailResponseDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { Public } from '../../common/auth/public.decorator';
import { AuditGuardDecision } from '../../common/audit/audit-guard-decision.decorator';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { GoogleOAuthEnabledGuard } from './guards/google-oauth-enabled.guard';
import { SmokeKeyGuard } from './guards/smoke-key.guard';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { User } from '../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { normalizePlatformRole } from '../../shared/enums/platform-roles.enum';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { AuthRegistrationService } from './services/auth-registration.service';
import { EmailVerificationService } from './services/email-verification.service';
import { AuditService } from '../audit/services/audit.service';
import { AuditEntityType, AuditAction } from '../audit/audit.constants';
import { isStagingRuntime } from '../../common/utils/runtime-env';
import { randomBytes } from 'crypto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { formatResponse } from '../../shared/helpers/response.helper';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';

function isLocalhostHost(host: string): boolean {
  return (
    host.includes('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('0.0.0.0')
  );
}

/**
 * Browsers treat each `*.up.railway.app` as a distinct site (public suffix).
 * Frontend (e.g. zephix-frontend-staging.up.railway.app) calling API on another
 * `*.up.railway.app` is cross-site; `SameSite=Strict|Lax` session cookies are not
 * sent on XHR/fetch, so `/auth/me` sees no JWT and returns `{ user: null }` while
 * login still 200s — the "Login succeeded but session not established" symptom.
 *
 * `ZEPHIX_ENV=staging` still opts in for non-Railway staging hosts.
 */
function requiresCrossSiteSessionCookies(host: string): boolean {
  if (isStagingRuntime()) {
    return true;
  }
  const h = String(host || '').toLowerCase();
  return h.includes('.up.railway.app');
}

function resolveSessionSameSite(host: string): 'lax' | 'strict' | 'none' {
  if (isLocalhostHost(host)) {
    return 'lax';
  }
  return requiresCrossSiteSessionCookies(host) ? 'none' : 'strict';
}

function resolveSessionSecureCookie(host: string, isHttps: boolean): boolean {
  if (isLocalhostHost(host)) {
    return false;
  }
  if (requiresCrossSiteSessionCookies(host)) {
    return true;
  }
  return isHttps;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly authRegistrationService: AuthRegistrationService,
    private readonly emailVerificationService: EmailVerificationService,
    @InjectRepository(UserOrganization)
    private userOrgRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * POST /api/auth/register (canonical endpoint)
   * POST /api/auth/signup (backward compatibility alias)
   *
   * Production-grade self-serve registration with:
   * - Neutral response (no account enumeration)
   * - Transactional creation (user, org, workspace, token, outbox)
   * - Token hashing (never stores raw tokens)
   * - Rate limiting
   */
  @Public()
  @Post('register')
  @Post('signup') // Backward compatibility alias
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @ApiOperation({ summary: 'Register a new user and organization' })
  @ApiResponse({
    status: 200,
    description: 'Registration request processed (neutral response)',
    type: RegisterResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(
    @Body() dto: RegisterDto | SignupDto,
    @Request() req: Request,
  ): Promise<RegisterResponseDto> {
    const ip = (req as any).ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Handle both DTO formats (RegisterDto or SignupDto)
    let email: string;
    let password: string;
    let fullName: string;
    let orgName: string;
    let orgSlug: string | undefined;

    if ('fullName' in dto && 'orgName' in dto) {
      // RegisterDto format
      email = dto.email;
      password = dto.password;
      fullName = dto.fullName;
      orgName = dto.orgName;
      orgSlug = (dto as any).orgSlug; // RegisterDto has orgSlug
    } else {
      // SignupDto format (backward compatibility)
      email = dto.email;
      password = dto.password;
      fullName = `${dto.firstName} ${dto.lastName}`.trim();
      orgName = dto.organizationName;
      orgSlug = undefined; // SignupDto doesn't have orgSlug
    }

    return this.authRegistrationService.registerSelfServe({
      email,
      password,
      fullName,
      orgName,
      orgSlug,
      ip: typeof ip === 'string' ? ip : ip[0],
      userAgent,
    });
  }

  /**
   * POST /api/auth/resend-verification
   *
   * Resend email verification with:
   * - Neutral response (no account enumeration)
   * - Rate limiting
   */
  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent (neutral response)',
    type: ResendVerificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Request() req: Request,
  ): Promise<ResendVerificationResponseDto> {
    const ip = (req as any).ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (user && !user.isEmailVerified) {
      await this.emailVerificationService.createToken(
        user.id,
        typeof ip === 'string' ? ip : ip[0],
        userAgent,
      );

      await this.auditService.record({
        organizationId: user.organizationId || '',
        actorUserId: user.id,
        actorPlatformRole: 'ADMIN',
        entityType: AuditEntityType.EMAIL_VERIFICATION,
        entityId: user.id,
        action: AuditAction.RESEND_VERIFICATION,
        after: { email: dto.email.toLowerCase() },
        ipAddress: typeof ip === 'string' ? ip : ip[0],
        userAgent,
      });
    }

    return {
      message:
        'If an account with this email exists, you will receive a verification email.',
    };
  }

  /**
   * POST /api/auth/forgot-password
   *
   * Neutral response (no account enumeration). Rate limited (IP + per-email when store configured).
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @SetMetadata('rateLimit', { windowMs: 900000, max: 3 })
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ ok: boolean }> {
    await this.authService.requestPasswordReset(dto.email);
    return { ok: true };
  }

  /**
   * POST /api/auth/reset-password
   *
   * Completes reset with token from email link; revokes all sessions for the user.
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @ApiOperation({ summary: 'Reset password using email token' })
  async postResetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ ok: boolean }> {
    await this.authService.resetPasswordWithToken(dto.token, dto.newPassword);
    return { ok: true };
  }

  /**
   * GET /api/auth/verify-email?token=...
   *
   * Verify email address using token (Phase 1: GET with query param)
   * Token is single-use and expires after 24 hours
   */
  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: VerifyEmailResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async verifyEmail(
    @Query('token') token: string,
  ): Promise<VerifyEmailResponseDto> {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Token query parameter is required');
    }

    const { userId } = await this.emailVerificationService.verifyToken(token);

    return {
      message: 'Email verified successfully',
      userId,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    const ip = (req as any).ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const loginResult = await this.authService.login(
      loginDto,
      ip as string,
      userAgent,
    );

    // Determine secure cookie setting based on request origin
    const hostHeader =
      (req as any).headers?.host ?? (req as any).get?.('host') ?? '';
    const host = String(hostHeader);
    const xfProto = String(
      (req as any).headers?.['x-forwarded-proto'] ?? '',
    ).toLowerCase();
    const isHttps = xfProto === 'https';
    const secureCookie = resolveSessionSecureCookie(host, isHttps);
    const sameSite = resolveSessionSameSite(host);

    // Set refresh token in HttpOnly cookie
    // Use 'lax' for localhost (works better with proxies), 'strict' for production
    res.cookie('zephix_refresh', loginResult.refreshToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Set access token in HttpOnly cookie
    res.cookie('zephix_session', loginResult.accessToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    return res.status(HttpStatus.OK).json(loginResult);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthEnabledGuard, RateLimiterGuard, AuthGuard('google'))
  @ApiOperation({ summary: 'Redirect to Google OAuth consent screen' })
  googleAuthRedirect(): void {
    /* Passport initiates redirect */
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthEnabledGuard, RateLimiterGuard, AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback — sets session cookies and redirects to frontend' })
  async googleOAuthCallback(
    @Request() req: AuthRequest,
    @Response() res: ExpressResponse,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException('OAuth callback missing authenticated user');
    }
    const user = req.user as User;
    const ip = (req as ExpressRequest & { ip?: string }).ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const loginResult = await this.authService.completeOAuthLogin(
      user,
      typeof ip === 'string' ? ip : String(ip),
      typeof userAgent === 'string' ? userAgent : String(userAgent),
    );

    const hostHeader =
      (req as ExpressRequest).headers?.host ??
      (req as ExpressRequest).get?.('host') ??
      '';
    const host = String(hostHeader);
    const xfProto = String(
      (req as ExpressRequest).headers?.['x-forwarded-proto'] ?? '',
    ).toLowerCase();
    const isHttps = xfProto === 'https';
    const secureCookie = resolveSessionSecureCookie(host, isHttps);
    const sameSite = resolveSessionSameSite(host);

    res.cookie('zephix_refresh', loginResult.refreshToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.cookie('zephix_session', loginResult.accessToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite,
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    const frontendRaw =
      this.configService.get<string>('app.frontendUrl') ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';
    const frontend = String(frontendRaw).replace(/\/$/, '');
    const target = `${frontend}/auth/callback?provider=google`;
    res.redirect(HttpStatus.FOUND, target);
  }

  @Post('smoke-login')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RateLimiterGuard, SmokeKeyGuard)
  @ApiOperation({ summary: 'Staging-only smoke login with key auth' })
  @ApiResponse({ status: 204, description: 'Smoke login successful' })
  async smokeLogin(
    @Body() dto: SmokeLoginDto,
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@zephix.dev')) {
      throw new BadRequestException('Smoke login requires a zephix.dev email');
    }

    const ip = (req as any).ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const loginResult = await this.authService.smokeLogin(
      normalizedEmail,
      ip as string,
      userAgent,
    );

    const hostHeader =
      (req as any).headers?.host ?? (req as any).get?.('host') ?? '';
    const host = String(hostHeader);
    const xfProto = String(
      (req as any).headers?.['x-forwarded-proto'] ?? '',
    ).toLowerCase();
    const isHttps = xfProto === 'https';
    const secureCookie = resolveSessionSecureCookie(host, isHttps);
    const sameSite = resolveSessionSameSite(host);

    res.cookie('zephix_refresh', loginResult.refreshToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.cookie('zephix_session', loginResult.accessToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite,
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: AuthRequest) {
    if (!(req as any).user) {
      return { user: null };
    }

    // Fetch full user from database to return complete user object
    const { userId } = getAuthContext(req);
    const user = await this.authService.getUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Load UserOrganization record for the current user and organization
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
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[AuthController] No UserOrganization record for userId=${user.id} orgId=${user.organizationId}. Falling back to user.role`,
        );
      }

      // Load organization to get features
      organization = await this.organizationRepository.findOne({
        where: { id: user.organizationId },
      });
    }

    // Use the same helper as login to ensure consistent structure
    // Pass the org role and organization explicitly
    return this.authService.buildUserResponse(user, orgRole, organization);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user account profile (name, avatar, role)' })
  async getAccountProfile(@Request() req: AuthRequest) {
    const { userId } = getAuthContext(req);
    return formatResponse(await this.authService.getUserAccountProfile(userId));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiOperation({ summary: 'Update current user account profile' })
  async patchAccountProfile(
    @Request() req: AuthRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    const { userId } = getAuthContext(req);
    return formatResponse(await this.authService.updateUserAccountProfile(userId, dto));
  }

  @Post('change-password')
  @AuditGuardDecision({
    action: 'config',
    scope: 'global',
    requiredRole: 'authenticated',
  })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for the current user' })
  async postChangePassword(
    @Request() req: AuthRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    const { userId } = getAuthContext(req);
    return formatResponse(await this.authService.changeUserPassword(userId, dto));
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Request() req: AuthRequest,
    @Response() res: any,
    @Body() body?: { sessionId?: string; refreshToken?: string },
  ) {
    const { userId } = getAuthContext(req);
    await this.authService.logout(userId, body?.sessionId, body?.refreshToken);

    // Clear session and refresh cookies
    res.clearCookie('zephix_session', { path: '/' });
    res.clearCookie('zephix_refresh', { path: '/' });

    return res.json({ message: 'Logged out successfully' });
  }

  @Public()
  @Get('csrf')
  @UseGuards(RateLimiterGuard)
  @ApiOperation({ summary: 'Get CSRF token' })
  @ApiResponse({
    status: 200,
    description: 'CSRF token returned in cookie and response body',
  })
  getCsrfToken(
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    const csrfToken = randomBytes(32).toString('hex');
    const hostHeader = req.headers?.host ?? req.get?.('host') ?? '';
    const host = String(hostHeader);
    const xfProto = String(req.headers?.['x-forwarded-proto'] ?? '').toLowerCase();
    const isHttps = xfProto === 'https';
    const secureCookie = resolveSessionSecureCookie(host, isHttps);
    const sameSite = resolveSessionSameSite(host);
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      secure: secureCookie,
      sameSite,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
    return res.json({ token: csrfToken, csrfToken });
  }

  @Public()
  @Post('refresh')
  @UseGuards(RateLimiterGuard)
  async refreshToken(
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
    @Body() body: { refreshToken?: string; sessionId?: string },
  ) {
    const ip = (req as any).ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const fromBody =
      body?.refreshToken && typeof body.refreshToken === 'string'
        ? body.refreshToken
        : undefined;
    const fromCookie = (req as ExpressRequest & { cookies?: Record<string, string> })
      .cookies?.['zephix_refresh'];
    const refreshToken = fromBody || fromCookie;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const refreshResult = await this.authService.refreshToken(
      refreshToken,
      body.sessionId || null,
      ip,
      userAgent,
    );

    // Determine secure cookie setting based on request origin
    const hostHeader =
      (req as any).headers?.host ?? (req as any).get?.('host') ?? '';
    const host = String(hostHeader);
    const xfProto = String(
      (req as any).headers?.['x-forwarded-proto'] ?? '',
    ).toLowerCase();
    const isHttps = xfProto === 'https';
    const secureCookie = resolveSessionSecureCookie(host, isHttps);
    const sameSite = resolveSessionSameSite(host);

    // Set refresh token in HttpOnly cookie
    // Use 'lax' for localhost (works better with proxies), 'strict' for production
    res.cookie('zephix_refresh', refreshResult.refreshToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Set access token in HttpOnly cookie
    res.cookie('zephix_session', refreshResult.accessToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    return res.json(refreshResult);
  }
}
