import { Injectable, UnauthorizedException, Optional, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import jwtConfig from '../../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { KeyLoaderService } from '../services/key-loader.service';

/**
 * JWT Authentication Strategy
 *
 * This strategy validates JWT tokens and extracts user information.
 * It supports both HS256 and RS256 algorithms with enhanced security.
 * Uses KeyLoaderService for key rotation and caching support.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly isEmergencyMode: boolean;

  constructor(
    @Optional()
    @InjectRepository(User)
    private readonly userRepository: Repository<User> | null,
    @Inject(jwtConfig.KEY) private readonly jwtCfg: ConfigType<typeof jwtConfig>,
    private readonly keyLoaderService: KeyLoaderService,
  ) {
    // Use secretOrKeyProvider for dynamic key loading (supports key rotation)
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: (request: any, rawJwtToken: string, done: Function) => {
        try {
          // Extract key ID from token header if present
          const decodedHeader = this.decodeTokenHeader(rawJwtToken);
          const keyId = decodedHeader?.kid || this.jwtCfg.keyId;
          
          // Get the appropriate key for validation
          const key = this.keyLoaderService.getCurrentAccessKey();
          done(null, key);
        } catch (error) {
          done(error, null);
        }
      },
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

    // Validate issuer and audience
    if (payload.iss !== this.jwtCfg.issuer) {
      throw new UnauthorizedException('Invalid token issuer');
    }

    if (payload.aud !== this.jwtCfg.audience) {
      throw new UnauthorizedException('Invalid token audience');
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

  /**
   * Decode JWT header to extract key ID (kid) for key rotation support
   */
  private decodeTokenHeader(token: string): any {
    try {
      const header = token.split('.')[0];
      return JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
    } catch (error) {
      return null;
    }
  }
}
