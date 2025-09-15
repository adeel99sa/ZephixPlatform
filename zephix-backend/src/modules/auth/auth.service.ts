import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
    if (password.length < 12) {
      throw new BadRequestException('Password must be at least 12 characters');
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

      // Generate JWT
      const token = this.generateToken(savedUser);

      return {
        user: this.sanitizeUser(savedUser),
        accessToken: token,
        organizationId: savedOrg.id,
        expiresIn: 86400  // ADD THIS LINE - 24 hours in seconds
      };
    });
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with organization
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date()
    });

    // Generate JWT
    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      accessToken: token,
      organizationId: user.organizationId,
      expiresIn: 86400  // ADD THIS LINE - 24 hours in seconds
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
      role: user.role
    };

    return this.jwtService.sign(payload);
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
      const decoded = this.jwtService.verify(refreshToken);
      const user = await this.getUserById(decoded.sub);
      
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const payload = {
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      };

      return {
        accessToken: this.jwtService.sign(payload),
        expiresIn: 86400
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