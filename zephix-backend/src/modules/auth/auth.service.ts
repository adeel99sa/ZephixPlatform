import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
  Inject,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from "../../modules/users/entities/user.entity"
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly isDatabaseAvailable: boolean;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Optional() @InjectRepository(User)
    private userRepository?: Repository<User>,
    @Optional() @InjectRepository(RefreshToken)
    private refreshTokenRepository?: Repository<RefreshToken>,
    @Optional() private usersService?: UsersService,
  ) {
    // Check if database is available
    this.isDatabaseAvailable = process.env.SKIP_DATABASE !== 'true';
    this.logger.log(`Database available: ${this.isDatabaseAvailable}`);
  }

  /**
   * Check if database is available
   */
  private checkDatabaseAvailability() {
    if (!this.isDatabaseAvailable || !this.userRepository || !this.refreshTokenRepository) {
      throw new ServiceUnavailableException('Authentication service temporarily unavailable. Database not configured.');
    }
  }

  /**
   * Fallback method when database is not available
   */
  private getFallbackResponse() {
    return {
      message: 'Authentication service temporarily unavailable',
      error: 'Database not configured',
      status: 'service_unavailable',
    };
  }

  /**
   * Authenticate user and generate tokens
   */
  async login(loginDto: LoginDto) {
    if (!this.isDatabaseAvailable || !this.userRepository || !this.refreshTokenRepository) {
      return this.getFallbackResponse();
    }

    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository!.findOne({
      where: { email: email.toLowerCase() },
      select: [
        'id',
        'email',
        'password',
        'firstName',
        'lastName',
        'role',
        'isActive',
      ],
    });

    if (!user || !user.isActive) {
      this.logger.warn(`Failed login attempt for email: ${email}`);
      return null;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for email: ${email}`);
      return null;
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Log successful login
    this.logger.log(`User logged in successfully: ${user.email}`);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * Create new user account
   */
  async signup(signupDto: SignupDto) {
    if (!this.isDatabaseAvailable || !this.userRepository || !this.refreshTokenRepository) {
      return this.getFallbackResponse();
    }

    const { email, password, firstName, lastName, organizationName } =
      signupDto;

    // Check if user exists
    const existingUser = await this.userRepository!.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository!.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role: 'user',
      isActive: true,
    });

    // Save user
    const savedUser = await this.userRepository!.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);

    // Save refresh token
    await this.saveRefreshToken(savedUser.id, tokens.refreshToken);

    // Log new signup
    this.logger.log(`New user signed up: ${savedUser.email}`);

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
      },
      ...tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    if (!this.isDatabaseAvailable || !this.userRepository || !this.refreshTokenRepository) {
      return this.getFallbackResponse();
    }

    // Find refresh token in database
    const tokenRecord = await this.refreshTokenRepository!.findOne({
      where: { token: refreshToken, isRevoked: false },
      relations: ['user'],
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      this.logger.warn('Invalid or expired refresh token attempt');
      return null;
    }

    // Generate new tokens
    const tokens = await this.generateTokens(tokenRecord.user);

    // Revoke old refresh token
    tokenRecord.isRevoked = true;
    await this.refreshTokenRepository!.save(tokenRecord);

    // Save new refresh token
    await this.saveRefreshToken(tokenRecord.user.id, tokens.refreshToken);

    this.logger.log(`Token refreshed for user: ${tokenRecord.user.email}`);

    return tokens;
  }

  /**
   * Logout user and revoke refresh tokens
   */
  async logout(userId: string) {
    if (!this.isDatabaseAvailable || !this.userRepository || !this.refreshTokenRepository) {
      return this.getFallbackResponse();
    }

    // Revoke all refresh tokens for user
    await this.refreshTokenRepository!.update(
      { user: { id: userId }, isRevoked: false },
      { isRevoked: true },
    );

    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    if (!this.isDatabaseAvailable || !this.userRepository || !this.refreshTokenRepository) {
      return this.getFallbackResponse();
    }

    return this.userRepository!.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  /**
   * Validate user credentials (for local strategy)
   */
  async validateUser(email: string, password: string) {
    if (!this.isDatabaseAvailable || !this.userRepository || !this.refreshTokenRepository) {
      return null;
    }

    const user = await this.userRepository!.findOne({
      where: { email: email.toLowerCase() },
      select: [
        'id',
        'email',
        'password',
        'firstName',
        'lastName',
        'role',
        'isActive',
      ],
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generate JWT and refresh tokens
   */
  private async generateTokens(user: User) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    const expiresIn = this.configService.get('jwt.expiresIn', '15m');
    const expiresInSeconds = this.parseExpiresIn(expiresIn);

    return {
      token: accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Save refresh token to database
   */
  private async saveRefreshToken(userId: string, token: string) {
    this.checkDatabaseAvailability();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const refreshToken = this.refreshTokenRepository!.create({
      token,
      user: { id: userId },
      expiresAt,
      isRevoked: false,
    });

    await this.refreshTokenRepository!.save(refreshToken);
  }

  /**
   * Parse expires in string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/(\d+)([smhd])/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
