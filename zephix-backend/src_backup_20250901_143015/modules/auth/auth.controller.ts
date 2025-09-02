import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Request } from 'express';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * User login endpoint
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);

    if (!result) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return result;
  }

  /**
   * User signup endpoint
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimiterGuard)
  @ApiOperation({ summary: 'Create new user account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or email already exists',
  })
  async signup(@Body() signupDto: SignupDto) {
    try {
      return await this.authService.signup(signupDto);
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new BadRequestException('Email already registered');
      }
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req: Request) {
    const userId = req.user?.['userId'];
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const user = await this.authService.getUserById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { user };
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(
      refreshTokenDto.refreshToken,
    );

    if (!result) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return result;
  }

  /**
   * User logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Req() req: Request) {
    const userId = req.user?.['userId'];
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    await this.authService.logout(userId);
    return { message: 'Logout successful' };
  }
}
