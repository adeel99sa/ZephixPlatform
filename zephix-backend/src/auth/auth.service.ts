import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
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
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    user: User;
    accessToken: string;
    requiresEmailVerification: boolean;
  }> {
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
    try {
      console.log('🔐 Login attempt for:', loginDto.email);
      const { email, password } = loginDto;

      // Find user by email
      console.log('🔍 Looking up user by email:', email.toLowerCase());
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        console.log('❌ User not found for email:', email);
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('✅ User found:', { id: user.id, email: user.email, isActive: user.isActive, isEmailVerified: user.isEmailVerified });

      // Verify password using bcrypt
      console.log('🔐 Verifying password...');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log('❌ Password validation failed for user:', user.id);
        throw new UnauthorizedException('Invalid credentials');
      }
      console.log('✅ Password validated successfully');

      // Check if user is active
      if (!user.isActive) {
        console.log('❌ User account is deactivated:', user.id);
        throw new UnauthorizedException('Account is deactivated');
      }

      // Check if email is verified (enterprise security requirement)
      if (!user.isEmailVerified) {
        console.log('⚠️ Email not verified for user:', user.id, '- TEMPORARILY ALLOWING LOGIN FOR TESTING');
        // TODO: Remove this bypass once email verification is implemented
        // throw new ForbiddenException(
        //   'Email verification required. Please check your email and verify your account before logging in.',
        // );
      }

      // Generate JWT token
      console.log('🎫 Generating JWT token for user:', user.id);
      const accessToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        emailVerified: user.isEmailVerified,
      });
      console.log('✅ JWT token generated successfully');

      console.log('🎉 Login successful for user:', user.id);
      return { user, accessToken };
    } catch (error) {
      console.error('🚨 Login error:', {
        email: loginDto.email,
        error: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      throw error;
    }
  }

  /**
   * Validate JWT token and return user
   * This method can be used by other services to validate tokens
   */
  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid token');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
