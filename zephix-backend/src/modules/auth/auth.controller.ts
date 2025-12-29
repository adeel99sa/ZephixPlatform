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
  Request,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import {
  ResendVerificationDto,
  ResendVerificationResponseDto,
} from './dto/resend-verification.dto';
import { VerifyEmailDto, VerifyEmailResponseDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { User } from '../users/entities/user.entity';
import { normalizePlatformRole } from '../../shared/enums/platform-roles.enum';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { AuthRegistrationService } from './services/auth-registration.service';
import { EmailVerificationService } from './services/email-verification.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authRegistrationService: AuthRegistrationService,
    private readonly emailVerificationService: EmailVerificationService,
    @InjectRepository(UserOrganization)
    private userOrgRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
  @Post('register')
  @Post('signup') // Backward compatibility alias
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes
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
    const ip = (req as any).ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Handle both DTO formats (RegisterDto or SignupDto)
    let email: string;
    let password: string;
    let fullName: string;
    let orgName: string;

    if ('fullName' in dto && 'orgName' in dto) {
      // RegisterDto format
      email = dto.email;
      password = dto.password;
      fullName = dto.fullName;
      orgName = dto.orgName;
    } else {
      // SignupDto format (backward compatibility)
      email = dto.email;
      password = dto.password;
      fullName = `${dto.firstName} ${dto.lastName}`.trim();
      orgName = dto.organizationName;
    }

    return this.authRegistrationService.registerSelfServe({
      email,
      password,
      fullName,
      orgName,
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
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 requests per hour
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
    const ip = (req as any).ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Find user by email (but don't reveal if not found)
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (user && !user.isEmailVerified) {
      // Create new token and outbox event (service handles outbox creation)
      await this.emailVerificationService.createToken(
        user.id,
        typeof ip === 'string' ? ip : ip[0],
        userAgent,
      );
    }

    // Always return neutral response (no account enumeration)
    return {
      message:
        'If an account with this email exists, you will receive a verification email.',
    };
  }

  /**
   * POST /api/auth/verify-email
   *
   * Verify email address using token
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 requests per hour
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: VerifyEmailResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<VerifyEmailResponseDto> {
    const { userId } = await this.emailVerificationService.verifyToken(
      dto.token,
    );

    return {
      message: 'Email verified successfully',
      userId,
    };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: AuthRequest) {
    // Fetch full user from database to return complete user object
    const { userId } = getAuthContext(req);
    const user = await this.authService.getUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Load UserOrganization record for the current user and organization
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
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[AuthController] No UserOrganization record found for user ${user.email} in org ${user.organizationId}. Falling back to user.role`,
        );
      }
    }

    // Use the same helper as login to ensure consistent structure
    // Pass the org role explicitly
    return this.authService.buildUserResponse(user, orgRole);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: AuthRequest) {
    const { userId } = getAuthContext(req);
    await this.authService.logout(userId);
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  async refreshToken(@Request() req, @Body() body: { refreshToken: string }) {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.refreshToken(body.refreshToken, ip, userAgent);
  }
}
