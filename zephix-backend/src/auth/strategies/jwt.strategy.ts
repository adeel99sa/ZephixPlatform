import { Injectable, UnauthorizedException, Optional } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';

/**
 * JWT Authentication Strategy
 *
 * This strategy validates JWT tokens and extracts user information.
 * It's used to protect routes that require authentication.
 *
 * EMERGENCY MODE: When SKIP_DATABASE=true, provides limited JWT validation
 * without database lookups for emergency recovery scenarios.
 *
 * MICROSERVICE EXTRACTION NOTES:
 * - This strategy can be easily moved to a separate auth microservice
 * - The JWT secret should be shared between services
 * - User validation can be done via API calls to the auth service
 * - Consider using Redis for token blacklisting in distributed systems
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly isEmergencyMode: boolean;

  constructor(
    @Optional()
    @InjectRepository(User)
    private readonly userRepository: Repository<User> | null,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'fallback-secret',
    });

    this.isEmergencyMode = process.env.SKIP_DATABASE === 'true';

    if (this.isEmergencyMode) {
      console.log(
        '🚨 JwtStrategy: Emergency mode - database validation disabled',
      );
    }
  }

  async validate(payload: any): Promise<User> {
    // EMERGENCY MODE: Return a minimal user object without database validation
    if (this.isEmergencyMode || !this.userRepository) {
      console.log(
        '🚨 JwtStrategy: Emergency mode - returning minimal user object',
      );

      // Return a minimal user object for emergency mode
      // This allows basic JWT validation to work without database
      return {
        id: payload.sub,
        email: payload.email,
        firstName: 'Emergency',
        lastName: 'User',
        isActive: true,
        isEmailVerified: true,
        password: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
    }

    // Full mode: Validate user from database
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return user;
  }
}
