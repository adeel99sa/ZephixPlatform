import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private dataSource: DataSource, // For transactions
  ) {}

  /**
   * Create new user account with organization
   */
  async signup(signupDto: SignupDto) {
    const { email, password, firstName, lastName, organizationName } = signupDto;

    try {
      this.logger.log(`Starting signup for email: ${email}`);

      // Check if user exists
      const existingUser = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        this.logger.warn(`Signup failed - email already exists: ${email}`);
        throw new BadRequestException('Email already exists');
      }

      // Hash password
      this.logger.debug('Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Use transaction to create organization and user together
      const result = await this.dataSource.transaction(async (manager) => {
        // Create organization first
        this.logger.debug('Creating organization...');
        const organization = manager.create(Organization, {
          id: uuidv4(),
          name: organizationName || `${firstName}'s Organization`,
          // Add default settings per your PRD
          settings: {
            resourceManagement: {
              enableFlexibleAllocation: true,
              maxAllocationPercentage: 150,
              warningThreshold: 80,
              criticalThreshold: 100,
              requireJustificationAt: 100,
              requireApprovalAt: 120,
            },
            riskManagement: {
              enabledRules: ['OVERALLOCATION', 'DEADLINE_SLIP', 'BUDGET_VARIANCE'],
              scanFrequency: 'DAILY',
              escalationThresholds: {},
            },
          },
        });
        const savedOrg = await manager.save(Organization, organization);
        this.logger.debug(`Organization created with ID: ${savedOrg.id}`);

        // Create user with organization
        this.logger.debug('Creating user...');
        const user = manager.create(User, {
          id: uuidv4(),
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          organizationId: savedOrg.id,
          role: 'admin', // First user is admin
          isActive: true,
        });
        const savedUser = await manager.save(User, user);
        this.logger.debug(`User created with ID: ${savedUser.id}`);

        return { user: savedUser, organization: savedOrg };
      });

      // Generate tokens
      this.logger.debug('Generating tokens...');
      const tokens = await this.generateTokens(result.user);

      // Save refresh token
      this.logger.debug('Saving refresh token...');
      await this.saveRefreshToken(result.user.id, tokens.refreshToken);

      this.logger.log(`Signup successful for: ${result.user.email}`);

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          organizationId: result.organization.id,
          organizationName: result.organization.name,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      this.logger.error(`Signup failed for ${email}:`, error.stack);
      
      // Re-throw known errors
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Log and throw generic error for unknown issues
      throw new InternalServerErrorException(
        'Failed to create account. Please try again.',
      );
    }
  }

  /**
   * Authenticate user and generate tokens
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      this.logger.log(`Login attempt for email: ${email}`);

      // Find user with organization
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
        select: ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'isActive', 'organizationId'],
        relations: ['organization'],
      });

      if (!user) {
        this.logger.warn(`Login failed - user not found: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.isActive) {
        this.logger.warn(`Login failed - user inactive: ${email}`);
        throw new UnauthorizedException('Account is inactive');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        this.logger.warn(`Login failed - invalid password: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Save refresh token
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      this.logger.log(`Login successful for: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization?.name,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      this.logger.error(`Login failed for ${email}:`, error.stack);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Login failed. Please try again.');
    }
  }

  /**
   * Generate JWT and refresh tokens
   */
  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      issuer: 'zephix-platform',
    });

    const refreshToken = uuidv4();

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Save refresh token to database
   */
  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const refreshToken = this.refreshTokenRepository.create({
      token,
      user: { id: userId },
      expiresAt,
      isRevoked: false,
    });

    await this.refreshTokenRepository.save(refreshToken);
  }

  // ... keep other methods as they are
}
  async getUserById(userId: string) {
    return this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'role'],
    });
  }

  async refreshToken(token: string) {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token, isRevoked: false },
      relations: ['user'],
    });
    
    if (!refreshToken || refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    const tokens = await this.generateTokens(refreshToken.user);
    return tokens;
  }

  async logout(userId: string) {
    await this.refreshTokenRepository.update(
      { user: { id: userId } },
      { isRevoked: true }
    );
  }

  async validateUser(email: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return null;
    }
    
    const { password: _, ...result } = user;
    return result;
  }
