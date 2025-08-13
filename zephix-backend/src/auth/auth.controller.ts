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

import { AuthService } from './auth.service';
import { EmailVerificationService } from './services/email-verification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import {
  EmailVerificationResponseDto,
  VerificationStatusResponseDto,
} from './dto/email-verification-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
// Local auth guard removed - using JWT strategy instead
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

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
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
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

  @Get('profile')
  @UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({
    status: 200,
    description: 'Email verification successful',
    type: EmailVerificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'Token not found' })
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
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    type: EmailVerificationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @UseGuards(JwtAuthGuard)
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
}
