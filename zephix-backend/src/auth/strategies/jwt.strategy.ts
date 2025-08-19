import { Injectable, UnauthorizedException, Optional } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { JWTConfigService } from '../../config/jwt.config';

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
  private readonly jwtConfig: any;

  constructor(
    @Optional()
    @InjectRepository(User)
    private readonly userRepository: Repository<User> | null,
    private readonly configService: ConfigService,
    private readonly jwtConfigService: JWTConfigService,
  ) {
    const jwtConfig = jwtConfigService.getConfig();
    
    // Configure strategy based on algorithm
    const strategyOptions = jwtConfig.algorithm === 'RS256' ? {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: jwtConfig.publicKey || 'fallback-public-key',
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      clockTolerance: 30, // 30 seconds tolerance for clock skew
    } : {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: jwtConfig.secret || 'fallback-secret',
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      clockTolerance: 30, // 30 seconds tolerance for clock skew
    };

    super(strategyOptions as any);

    this.jwtConfig = jwtConfig;
    this.isEmergencyMode = process.env.SKIP_DATABASE === 'true';

    if (this.isEmergencyMode) {
      console.log(
        '🚨 JwtStrategy: Emergency mode - database validation disabled',
      );
    }

    console.log(`🔐 JWT Strategy initialized with ${jwtConfig.algorithm} algorithm`);
  }

  async validate(payload: any): Promise<User> {
    // Validate payload structure
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid JWT payload structure');
    }

    // Validate issuer if configured
    if (this.jwtConfig.issuer && payload.iss !== this.jwtConfig.issuer) {
      throw new UnauthorizedException('Invalid JWT issuer');
    }

    // Validate audience if configured
    if (this.jwtConfig.audience && payload.aud !== this.jwtConfig.audience) {
      throw new UnauthorizedException('Invalid JWT audience');
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

    // Log successful authentication for audit
    console.log(`🔐 JWT validation successful for user: ${user.email} (${user.id})`);

    return user;
  }
}
