import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';  // Fixed path
import { Organization } from '../../organizations/entities/organization.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, firstName, lastName, organizationName } = signupDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Simple password validation
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Use transaction for consistency
    return this.dataSource.transaction(async manager => {
      // Create organization
      const organization = manager.create(Organization, {
        name: organizationName,
        slug: organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        settings: {
          resourceManagement: {
            maxAllocationPercentage: 150,
            warningThreshold: 80,
            criticalThreshold: 100
          }
        }
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
        role: 'admin' // First user is admin
      });
      const savedUser = await manager.save(user);

      // Generate JWT tokens
      const accessToken = this.generateToken(savedUser);
      const refreshToken = this.generateRefreshToken(savedUser);

      return {
        user: this.sanitizeUser(savedUser),
        accessToken,
        refreshToken,
        organizationId: savedOrg.id,
        expiresIn: 900  // 15 minutes in seconds
      };
    });
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    console.log('Login attempt for email:', email);

    let user: User;
    try {
      // Find user with organization
      user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          isActive: true,
          organizationId: true,
          organizationRole: true,
          role: true,
          currentWorkspaceId: true
        }
      });

      console.log('User found:', user ? 'Yes' : 'No');
      if (user) {
        console.log('User details:', {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive
        });
      }

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check password
      console.log('Checking password...');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Password valid:', isPasswordValid);
      
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }

    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date()
    });

    // Generate JWT tokens
    const accessToken = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      organizationId: user.organizationId,
      expiresIn: 900  // 15 minutes in seconds
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true }
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      workspaceId: user.currentWorkspaceId || null,
      role: user.role,
      organizationRole: user.organizationRole
    };

    return this.jwtService.sign(payload, { 
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '15m'
    });
  }

  private generateRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      workspaceId: user.currentWorkspaceId || null,
      role: user.role,
      organizationRole: user.organizationRole
    };

    return this.jwtService.sign(payload, { 
      secret: this.configService.get<string>('jwt.refreshSecret') || this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') || '7d'
    });
  }

  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: [
          'id', 'email', 'firstName', 'lastName', 
          'organizationId', 'role', 'isActive'
        ]
      });
      return user;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  async refreshToken(refreshToken: string, ip: string, userAgent: string) {
    // For MVP, we'll just validate the current token and issue a new one
    // In production, you'd validate against a stored refresh token
    try {
      // Decode the refresh token to get user ID
      const decoded = this.jwtService.verify(refreshToken, { 
        secret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret' 
      });
      const user = await this.getUserById(decoded.sub);
      
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const payload = {
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        workspaceId: user.currentWorkspaceId || null,
        role: user.role,
        organizationRole: user.organizationRole,
      };

      const accessToken = this.jwtService.sign(payload, { 
        secret: process.env.JWT_SECRET || 'fallback-secret-key',
        expiresIn: '15m' 
      });
      const newRefreshToken = this.jwtService.sign(payload, { 
        secret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
        expiresIn: '7d' 
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900  // 15 minutes in seconds
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    // For MVP, logout is handled client-side by removing the token
    // In production, you might want to blacklist the token or track logout events
    console.log(`User ${userId} logged out`);
    
    // Add audit log if you have audit service
    // await this.auditService.log('USER_LOGOUT', userId);
    
    return;
  }

}