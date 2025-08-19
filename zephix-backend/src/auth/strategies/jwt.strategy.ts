import { Injectable, UnauthorizedException, Optional, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import jwtConfig from '../../config/jwt.config';
import { ConfigType } from '@nestjs/config';

/**
 * JWT Authentication Strategy
 *
 * This strategy validates JWT tokens and extracts user information.
 * It supports both HS256 and RS256 algorithms for enhanced security.
 * It's used to protect routes that require authentication.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly isEmergencyMode: boolean;

  constructor(
    @Optional()
    @InjectRepository(User)
    private readonly userRepository: Repository<User> | null,
    @Inject(jwtConfig.KEY) private readonly jwtCfg: ConfigType<typeof jwtConfig>,
  ) {
    const secretOrKey = jwtCfg.algorithm === 'RS256' ? jwtCfg.publicKey : jwtCfg.secret;
    
    if (!secretOrKey) {
      throw new Error(`JWT ${jwtCfg.algorithm === 'RS256' ? 'public key' : 'secret'} is required`);
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey,
      ignoreExpiration: false,
      algorithms: [jwtCfg.algorithm],
      issuer: jwtCfg.issuer,
      audience: jwtCfg.audience,
    });

    this.isEmergencyMode = process.env.SKIP_DATABASE === 'true';

    if (this.isEmergencyMode) {
      console.log('🚨 JwtStrategy: Emergency mode - database validation disabled');
    }

    console.log(`🔐 JWT Strategy initialized with ${jwtCfg.algorithm} algorithm`);
  }

  async validate(payload: any): Promise<User> {
    // Validate payload structure
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid JWT payload structure');
    }

    // EMERGENCY MODE: Return a minimal user object without database validation
    if (this.isEmergencyMode || !this.userRepository) {
      console.log('🚨 JwtStrategy: Emergency mode - returning minimal user object');

      return {
        id: payload.sub,
        email: payload.email,
        firstName: payload.firstName || 'Emergency',
        lastName: payload.lastName || 'User',
        isActive: true,
        isEmailVerified: true,
        password: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: payload.role || 'user',
        organizationId: payload.organizationId,
        organizations: payload.organizations || [],
        userOrganizations: payload.userOrganizations || [],
        refreshTokens: [],
      } as unknown as User;
    }

    // Full mode: Validate user from database
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: [
        'id', 'email', 'firstName', 'lastName', 'isActive', 'isEmailVerified',
        'role', 'organizationId', 'createdAt', 'updatedAt'
      ],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (!user.isEmailVerified && process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Email verification required');
    }

    console.log(`🔐 JWT validation successful for user: ${user.email} (${user.id})`);

    return user;
  }
}
