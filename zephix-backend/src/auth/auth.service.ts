import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

import { User } from "../modules/users/entities/user.entity"
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailVerificationService } from './services/email-verification.service';

/**
 * Authentication Service
 *
 * Handles user registration, login, and JWT token generation.
 *
 * EMERGENCY MODE: When SKIP_DATABASE=true, provides limited functionality
 * without database operations for emergency recovery scenarios.
 *
 * MICROSERVICE EXTRACTION NOTES:
 * - This service can be moved to a dedicated auth microservice
 * - Password hashing should use bcrypt with salt rounds >= 12
 * - JWT tokens should have appropriate expiration times
 * - Consider implementing refresh tokens for better security
 * - User creation can be delegated to a user service
 * - Token validation can be moved to a shared auth service
 */
@Injectable()
export class AuthService {
  private readonly isEmergencyMode: boolean;

  constructor(
    @Optional() @InjectRepository(User)
    private readonly userRepository: Repository<User> | null,
    private readonly jwtService: JwtService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {
    this.isEmergencyMode = process.env.SKIP_DATABASE === 'true';
    
    if (this.isEmergencyMode) {
      console.log('🚨 AuthService: Emergency mode - database operations disabled');
      if (!this.userRepository) {
        console.log('🚨 AuthService: UserRepository not available in emergency mode');
      }
    } else {
      if (!this.userRepository) {
        console.error('❌ AuthService: UserRepository required but not available');
        throw new Error('UserRepository is required for full authentication mode');
      }
    }
  }

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    user: User;
    accessToken: string;
    requiresEmailVerification: boolean;
  }> {
    // EMERGENCY MODE: Return service unavailable
    if (this.isEmergencyMode || !this.userRepository) {
      throw new ServiceUnavailableException(
        'User registration is temporarily unavailable due to database maintenance. Please try again later.'
      );
    }

    const { email, password, firstName, lastName } = registerDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password with bcrypt (12 salt rounds for security)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (email verification required)
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      isActive: true,
      isEmailVerified: false, // Email verification required
    });

    const savedUser = await this.userRepository.save(user);

    // Send verification email
    await this.emailVerificationService.sendVerificationEmail(
      savedUser,
      ipAddress,
      userAgent,
    );

    // Generate JWT token (user can have token but limited access until verified)
    const accessToken = this.jwtService.sign({
      sub: savedUser.id,
      email: savedUser.email,
      emailVerified: savedUser.isEmailVerified,
    });

    return {
      user: savedUser,
      accessToken,
      requiresEmailVerification: true,
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: User; accessToken: string }> {
    // EMERGENCY MODE: Return service unavailable
    if (this.isEmergencyMode || !this.userRepository) {
      throw new ServiceUnavailableException(
        'User login is temporarily unavailable due to database maintenance. Please try again later.'
      );
    }

    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    // Generate JWT token
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      emailVerified: user.isEmailVerified,
    });

    return {
      user,
      accessToken,
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    // EMERGENCY MODE: Return null to indicate user not found
    if (this.isEmergencyMode || !this.userRepository) {
      console.log('🚨 AuthService: Emergency mode - user validation disabled');
      return null;
    }

    return this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });
  }

  async refreshToken(userId: string): Promise<{ accessToken: string }> {
    // EMERGENCY MODE: Return service unavailable
    if (this.isEmergencyMode || !this.userRepository) {
      throw new ServiceUnavailableException(
        'Token refresh is temporarily unavailable due to database maintenance. Please try again later.'
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      emailVerified: user.isEmailVerified,
    });

    return { accessToken };
  }

  // EMERGENCY MODE: Health check method
  async healthCheck(): Promise<{ status: string; mode: string; timestamp: string }> {
    return {
      status: this.isEmergencyMode ? 'degraded' : 'healthy',
      mode: this.isEmergencyMode ? 'emergency' : 'full',
      timestamp: new Date().toISOString(),
    };
  }
}
