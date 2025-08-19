import { Injectable, UnauthorizedException, Optional, Inject, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity';
import jwtConfig from '../../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { KeyLoaderService } from '../services/key-loader.service';

/**
 * JWT Refresh Token Strategy
 *
 * This strategy validates JWT refresh tokens with different rules than access tokens.
 * Uses separate issuer, audience, and validation logic.
 * Includes JTI (JWT ID) validation for reuse detection.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  private readonly logger = new Logger(JwtRefreshStrategy.name);
  private readonly isEmergencyMode: boolean;

  constructor(
    @Optional()
    @InjectRepository(User)
    private readonly userRepository: Repository<User> | null,
    @Optional()
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken> | null,
    @Inject(jwtConfig.KEY) private readonly jwtCfg: ConfigType<typeof jwtConfig>,
    private readonly keyLoaderService: KeyLoaderService,
  ) {
    // Call super() first with basic configuration
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'placeholder', // Will be overridden
      ignoreExpiration: false,
      algorithms: [jwtCfg.algorithm],
      issuer: jwtCfg.issuer,
      audience: jwtCfg.refreshAudience, // Must use refresh audience
    });

    // Configure strategy based on algorithm
    this.configureStrategy();

    this.isEmergencyMode = process.env.SKIP_DATABASE === 'true';

    if (this.isEmergencyMode) {
      console.log('🚨 JwtRefreshStrategy: Emergency mode - database validation disabled');
    }

    console.log(`🔐 JWT Refresh Strategy initialized with ${jwtCfg.algorithm} algorithm`);
  }

  /**
   * Configure strategy behavior based on algorithm
   */
  private configureStrategy(): void {
    const isRS256 = this.jwtCfg.algorithm === 'RS256';
    
    if (isRS256) {
      // RS256: Use secretOrKeyProvider for dynamic key loading
      (this as any).secretOrKeyProvider = (request: any, rawJwtToken: string, done: Function) => {
        try {
          // Extract key ID from token header for proper key selection
          const decodedHeader = this.decodeTokenHeader(rawJwtToken);
          const keyId = decodedHeader?.kid;
          
          if (!keyId) {
            // Reject tokens missing kid when RS256
            return done(new UnauthorizedException('RS256 refresh tokens must include kid header'), null);
          }

          // Get the specific refresh public key by kid for rotation support
          const key = this.keyLoaderService.getRefreshPublicKeyByKid(keyId);
          if (!key) {
            // If key not found, try current refresh key (grace period)
            const currentKey = this.keyLoaderService.getCurrentRefreshKey();
            done(null, currentKey);
            return;
          }

          done(null, key);
        } catch (error) {
          this.logger.error('Refresh key loading error:', error.message);
          done(error, null);
        }
      };
      // Remove the static secretOrKey for RS256
      delete (this as any).secretOrKey;
    } else {
      // HS256: Use secret directly
      (this as any).secretOrKey = this.keyLoaderService.getCurrentRefreshKey();
    }
  }

  async validate(payload: any): Promise<any> {
    // Validate payload structure
    if (!payload.sub || !payload.email || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token payload structure');
    }

    // Validate issuer and audience
    if (payload.iss !== this.jwtCfg.issuer) {
      throw new UnauthorizedException('Invalid refresh token issuer');
    }

    if (payload.aud !== this.jwtCfg.refreshAudience) {
      throw new UnauthorizedException('Invalid refresh token audience');
    }

    // Validate token type (must be refresh token)
    if (payload.aud !== this.jwtCfg.refreshAudience) {
      throw new UnauthorizedException('Token is not a refresh token');
    }

    // EMERGENCY MODE: Return minimal validation
    if (this.isEmergencyMode || !this.userRepository || !this.refreshTokenRepository) {
      console.log('🚨 JwtRefreshStrategy: Emergency mode - returning minimal validation');

      return {
        userId: payload.sub,
        email: payload.email,
        jti: payload.jti,
        deviceId: payload.deviceId,
        type: 'refresh',
      };
    }

    // Full mode: Validate user and refresh token from database
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'isActive', 'isEmailVerified'],
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

    // Check if refresh token exists and is valid
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { 
        id: payload.jti,
        user: { id: payload.sub },
        isRevoked: false,
      },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found or revoked');
    }

    if (refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Log only non-sensitive information
    this.logger.debug(`Refresh token validated for user: ${user.email} (${user.id}) with jti: ${payload.jti}`);

    return {
      userId: payload.sub,
      email: payload.email,
      jti: payload.jti,
      deviceId: payload.deviceId,
      type: 'refresh',
      user,
      refreshToken,
    };
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
