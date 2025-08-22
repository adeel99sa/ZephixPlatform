import { Injectable, Logger, ConflictException, UnauthorizedException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../modules/users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    
    // Check if user exists
    const exists = await this.usersRepo.findOne({ where: { email }});
    if (exists) {
      throw new ConflictException('User with this email already exists');
    }

    // Create user
    const user = this.usersRepo.create({
      email,
      password: await bcrypt.hash(dto.password, 10),
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'USER',
      isEmailVerified: false,
    });
    
    // Save user to database first to ensure password is stored
    const savedUser = await this.usersRepo.save(user);

    // Check skip flag
    const skipValue = this.config.get('SKIP_EMAIL_VERIFICATION');
    const skip = skipValue === 'true';
    this.logger.log(`SKIP_EMAIL_VERIFICATION=${skipValue}, skip=${skip}`);

    // RETURN EARLY if skipping
    if (skip) {
      savedUser.isEmailVerified = true;
      await this.usersRepo.save(savedUser);
      this.logger.log(`Auto-verified user ${email} (skip mode)`);
      return {
        accessToken: this.jwtService.sign({ sub: savedUser.id, email: savedUser.email, role: savedUser.role }),
        refreshToken: this.jwtService.sign({ sub: savedUser.id, email: savedUser.email, role: savedUser.role }, { expiresIn: '7d' }),
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: savedUser.role,
          isEmailVerified: savedUser.isEmailVerified,
        },
        requiresEmailVerification: false,
      };
    }

    // Try to send email
    try {
      // For now, just throw error since email service isn't configured
      throw new Error('Email service not configured');
    } catch (err) {
      this.logger.error('Failed to send verification email', err);
      // Clean up user if email fails
      await this.usersRepo.delete(user.id);
      throw new ServiceUnavailableException('Email service unavailable');
    }
    
    // This return is for when email verification is needed
    return {
      accessToken: this.jwtService.sign({ sub: savedUser.id, email: savedUser.email, role: savedUser.role }),
      refreshToken: this.jwtService.sign({ sub: savedUser.id, email: savedUser.email, role: savedUser.role }, { expiresIn: '7d' }),
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        isEmailVerified: savedUser.isEmailVerified,
      },
      requiresEmailVerification: true,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.usersRepo.findOne({ where: { email }});
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      this.logger.error(`User ${user.email} has no password in database`);
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check verification status
    const skip = this.config.get('SKIP_EMAIL_VERIFICATION') === 'true';
    if (!user.isEmailVerified && !skip) {
      throw new ForbiddenException('Email not verified');
    }

    return this.issueTokens(user);
  }

  private issueTokens(user: User) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      organizationId: user.organizationId 
    };
    
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }
    };
  }

  private generateVerificationToken(userId: string): string {
    return this.jwtService.sign({ sub: userId }, { expiresIn: '24h' });
  }
}
