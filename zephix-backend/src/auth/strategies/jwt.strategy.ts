import { Injectable, UnauthorizedException, Optional, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
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
 *
 * EMERGENCY MODE: When SKIP_DATABASE=true, provides limited JWT validation
 * without database lookups for emergency recovery scenarios.
 *
 * MICROSERVICE EXTRACTION NOTES:
 * - This strategy can be easily moved to a separate auth microservice
 * - The JWT keys should be shared between services
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
    @Inject(jwtConfig.KEY) private readonly jwtCfg: ConfigType<typeof jwtConfig>,
  ) {
    const algorithm = jwtCfg.algorithm;
    const secret = jwtCfg.secret;
    const publicKey = jwtCfg.publicKey;

    
    if (!secret && algorithm === 'HS256') {
      throw new Error('JWT_SECRET is required for HS256 algorithm');
    }
    
    if (!publicKey && algorithm === 'RS256') {
      throw new Error('JWT_PUBLIC_KEY is required for RS256 algorithm');
    }

    // Configure strategy based on algorithm
    const strategyOptions = algorithm === 'RS256' ? {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: publicKey,
      clockTolerance: 30, // 30 seconds tolerance for clock skew
    } : {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: secret,
      clockTolerance: 30, // 30 seconds tolerance for clock skew
    };

    super(strategyOptions as any);

    this.isEmergencyMode = process.env.SKIP_DATABASE === 'true';

    if (this.isEmergencyMode) {
      console.log(
        '🚨 JwtStrategy: Emergency mode - database validation disabled',
      );
    }

    console.log(`🔐 JWT Strategy initialized with ${algorithm} algorithm`);
  }

  async validate(payload: any): Promise<User> {
    // Validate payload structure
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid JWT payload structure');
    }

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
        refreshTokens: [], // Add missing required property
      } as unknown as User;
    }

    // Full mode: Validate user from database
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: [
        'id', 'email', 'firstName', 'lastName', 'isActive', 'isEmailVerified',
        'role', 'createdAt', 'updatedAt'
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

    // Merge JWT payload information with database user information
    // This ensures organization context is preserved from the token
    const enrichedUser = {
      ...user,
      organizationId: payload.organizationId,
      role: payload.role || user.role,
      organizations: payload.organizations || [],
      userOrganizations: payload.userOrganizations || [],
    };

    // Log successful authentication for audit
    console.log(`🔐 JWT validation successful for user: ${user.email} (${user.id})`);
    console.log(`🔐 User organization context: ${enrichedUser.organizationId}, role: ${enrichedUser.role}`);

    return enrichedUser;
  }
}
