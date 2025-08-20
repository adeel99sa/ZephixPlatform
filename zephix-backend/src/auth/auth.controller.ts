import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  Ip,
  Headers,
  Options,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import {
  PasswordResetRequestDto,
  PasswordResetConfirmDto,
  PasswordResetResponseDto,
} from './dto/password-reset.dto';
import {
  EmailVerificationResponseDto,
  VerificationStatusResponseDto,
} from './dto/email-verification-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
// Local auth guard removed - using JWT strategy instead
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../modules/users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { AuthRateLimitGuard } from '../common/guards/auth-rate-limit.guard';
import {
  RateLimit,
  AuthRateLimits,
} from '../common/decorators/rate-limit.decorator';

/**
 * Authentication Controller
 *
 * Handles user registration, login, profile management, and email verification.
 *
 * MICROSERVICE EXTRACTION NOTES:
 * - This controller can be moved to a dedicated auth microservice
 * - All endpoints should be prefixed with /api/auth
 * - Consider adding rate limiting for security
 * - Profile endpoint can be moved to a user service later
 * - JWT tokens should be validated by a shared auth service
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute (OWASP ASVS Level 1)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.register(
      registerDto,
      ipAddress,
      userAgent,
    );
    return {
      message: result.requiresEmailVerification
        ? 'Registration successful! Please check your email to verify your account before logging in.'
        : 'User registered successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        isEmailVerified: result.user.isEmailVerified,
      },
      accessToken: result.accessToken,
      requiresEmailVerification: result.requiresEmailVerification,
    };
  }

  @Get('test')
  @HttpCode(HttpStatus.OK)
  async testEndpoint() {
    return {
      message: 'Auth endpoint is accessible',
      timestamp: new Date().toISOString(),
      status: 'ok',
    };
  }

  @Options('login')
  @HttpCode(204)
  @Header('Access-Control-Allow-Origin', 'https://getzephix.com')
  @Header('Access-Control-Allow-Credentials', 'true')
  @Header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  @Header('Access-Control-Allow-Methods', 'POST, OPTIONS')
  optionsLogin() {
    // This method handles CORS preflight requests
    return;
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute (OWASP ASVS Level 1)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return {
      message: 'Login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout() {
    // In a stateless JWT system, logout is handled client-side
    // But we can add server-side token blacklisting here if needed
    return {
      message: 'Logout successful',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async refreshToken(@CurrentUser() user: User) {
    // Generate new access token
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      emailVerified: user.isEmailVerified,
    });

    return {
      message: 'Token refreshed successfully',
      accessToken,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  async getCurrentUser(@CurrentUser() user: User) {
    return {
      message: 'Profile retrieved successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user profile (legacy endpoint)' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  async getProfile(@CurrentUser() user: User) {
    return {
      message: 'Profile retrieved successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  @Get('verify-email/:token')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute for email verification
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({
    status: 200,
    description: 'Email verification successful',
    type: EmailVerificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  @ApiResponse({ status: 429, description: 'Too many verification attempts' })
  async verifyEmail(
    @Param('token') token: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<EmailVerificationResponseDto> {
    const result = await this.emailVerificationService.verifyEmail(
      token,
      ipAddress,
      userAgent,
    );

    return {
      success: result.success,
      message:
        'Email verified successfully! You can now log in to your account.',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        isEmailVerified: result.user.isEmailVerified,
      },
    };
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per minute for email verification
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    type: EmailVerificationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiBearerAuth()
  async resendVerificationEmail(
    @CurrentUser() user: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<EmailVerificationResponseDto> {
    await this.emailVerificationService.resendVerificationEmail(
      user.id,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    };
  }

  @Get('verification-status')
  @ApiOperation({ summary: 'Check email verification status' })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved',
    type: VerificationStatusResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getVerificationStatus(
    @CurrentUser() user: User,
  ): Promise<VerificationStatusResponseDto> {
    return this.emailVerificationService.checkVerificationStatus(user.id);
  }

  @Post('password-reset/request')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per minute for password reset
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description:
      'Password reset initiated (always returns success for security)',
    type: PasswordResetResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many password reset requests' })
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<PasswordResetResponseDto> {
    const result = await this.passwordResetService.initiatePasswordReset(
      dto,
      ipAddress,
      userAgent,
    );

    return {
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('password-reset/confirm')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute for password reset confirmation
  @ApiOperation({ summary: 'Confirm password reset with token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    type: PasswordResetResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or password requirements not met',
  })
  @ApiResponse({ status: 429, description: 'Too many password reset attempts' })
  @HttpCode(HttpStatus.OK)
  async confirmPasswordReset(
    @Body() dto: PasswordResetConfirmDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<PasswordResetResponseDto> {
    const result = await this.passwordResetService.confirmPasswordReset(
      dto,
      ipAddress,
      userAgent,
    );

    return {
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('password-reset/validate/:token')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute for token validation
  @ApiOperation({ summary: 'Validate password reset token' })
  @ApiResponse({
    status: 200,
    description: 'Token validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        expired: { type: 'boolean', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Too many validation requests' })
  @HttpCode(HttpStatus.OK)
  async validatePasswordResetToken(@Param('token') token: string) {
    return this.passwordResetService.validateResetToken(token);
  }
}
