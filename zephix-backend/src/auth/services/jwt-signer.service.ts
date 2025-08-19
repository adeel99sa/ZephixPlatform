import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import jwtConfig from '../../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { KeyLoaderService } from './key-loader.service';

export interface JWTSignOptions {
  sub: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  organizationId?: string;
  deviceId?: string;
}

export interface JWTRefreshSignOptions {
  sub: string;
  email: string;
  deviceId: string;
  tokenId: string; // JTI for reuse detection
}

/**
 * JWT Signer Service
 * 
 * Handles JWT token signing with private keys.
 * Keeps private keys out of the request path for security.
 * Sets proper headers including key ID (kid) for rotation support.
 */
@Injectable()
export class JwtSignerService {
  private readonly logger = new Logger(JwtSignerService.name);
  private readonly jwtCfg: ConfigType<typeof jwtConfig>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly keyLoaderService: KeyLoaderService,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get(jwtConfig.KEY);
    if (!config) {
      throw new Error('JWT configuration not found');
    }
    this.jwtCfg = config;
  }

  /**
   * Sign an access token
   */
  async signAccessToken(options: JWTSignOptions): Promise<string> {
    try {
      const signingKey = this.keyLoaderService.getCurrentSigningKey();
      const payload = {
        sub: options.sub,
        email: options.email,
        firstName: options.firstName,
        lastName: options.lastName,
        role: options.role,
        organizationId: options.organizationId,
        deviceId: options.deviceId,
        iss: this.jwtCfg.issuer,
        aud: this.jwtCfg.audience,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + this.parseExpiry(this.jwtCfg.expiresIn),
      };

      const token = await this.jwtService.signAsync(payload, {
        algorithm: this.jwtCfg.algorithm,
        expiresIn: this.jwtCfg.expiresIn,
        issuer: this.jwtCfg.issuer,
        audience: this.jwtCfg.audience,
        keyid: this.jwtCfg.keyId,
        header: {
          kid: this.jwtCfg.keyId,
          alg: this.jwtCfg.algorithm,
          typ: 'JWT',
        },
      });

      this.logger.debug(`Access token signed for user: ${options.email} with kid: ${this.jwtCfg.keyId}`);
      return token;
    } catch (error) {
      this.logger.error('Failed to sign access token:', error);
      throw error;
    }
  }

  /**
   * Sign a refresh token
   */
  async signRefreshToken(options: JWTRefreshSignOptions): Promise<string> {
    try {
      const refreshSigningKey = this.keyLoaderService.getCurrentRefreshSigningKey();
      const payload = {
        sub: options.sub,
        email: options.email,
        deviceId: options.deviceId,
        jti: options.tokenId, // JTI for reuse detection
        iss: this.jwtCfg.issuer,
        aud: this.jwtCfg.refreshAudience,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + this.parseExpiry(this.jwtCfg.refreshExpiresIn),
      };

      const token = await this.jwtService.signAsync(payload, {
        algorithm: this.jwtCfg.algorithm,
        expiresIn: this.jwtCfg.refreshExpiresIn,
        issuer: this.jwtCfg.issuer,
        audience: this.jwtCfg.refreshAudience,
        keyid: `${this.jwtCfg.keyId}_refresh`,
        header: {
          kid: `${this.jwtCfg.keyId}_refresh`,
          alg: this.jwtCfg.algorithm,
          typ: 'JWT',
        },
      });

      this.logger.debug(`Refresh token signed for user: ${options.email} with kid: ${this.jwtCfg.keyId}_refresh`);
      return token;
    } catch (error) {
      this.logger.error('Failed to sign refresh token:', error);
      throw error;
    }
  }

  /**
   * Verify a token (read-only, no private key access)
   */
  async verifyToken(token: string, audience?: string): Promise<any> {
    try {
      const options: any = {
        issuer: this.jwtCfg.issuer,
        audience: audience || this.jwtCfg.audience,
        clockTolerance: 10, // 10 seconds clock skew tolerance
      };

      const payload = await this.jwtService.verifyAsync(token, options);
      
      this.logger.debug(`Token verified for user: ${payload.email} with kid: ${payload.kid || 'unknown'}`);
      return payload;
    } catch (error) {
      this.logger.warn('Token verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: throw new Error(`Unknown expiry unit: ${unit}`);
    }
  }

  /**
   * Get current key ID for monitoring
   */
  getCurrentKeyId(): string {
    return this.jwtCfg.keyId || 'unknown';
  }

  /**
   * Get current refresh key ID for monitoring
   */
  getCurrentRefreshKeyId(): string {
    return `${this.jwtCfg.keyId || 'unknown'}_refresh`;
  }
}
