import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, organizationName } = registerDto;
    
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate a simple organizationId from organizationName
    const organizationId = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
    
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      isEmailVerified: false,
      organizationId,
    });
    
    const savedUser = await this.userRepository.save(user);
    
    // Generate tokens for immediate login after signup
    const tokens = this.generateTokens(savedUser);
    
    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        isEmailVerified: savedUser.isEmailVerified,
        organizationId: savedUser.organizationId,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'isActive', 'isEmailVerified', 'organizationId'],
    });
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // Generate tokens using the helper method
    const tokens = this.generateTokens(user);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        organizationId: user.organizationId,
      },
      ...tokens,
    };
  }

  /**
   * Generate access and refresh tokens for a user
   */
  private generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
    
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'isEmailVerified', 'organizationId'],
      });
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      const tokens = this.generateTokens(user);
      
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          organizationId: user.organizationId,
        },
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
