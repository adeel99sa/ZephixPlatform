import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../users/entities/user.entity';
import Redis from 'ioredis';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class JwtTokenService {
  private redis: Redis | null;

  constructor(
    private jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    // Initialize Redis connection with error handling
    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      this.redis.on('error', (err) => {
        console.warn('JWT Redis connection error:', err.message);
        this.redis = null;
      });
    } catch (error) {
      console.warn('JWT Redis not available, using database-only token management:', error.message);
      this.redis = null;
    }
  }

  async generateTokens(user: User): Promise<TokenPair> {
    const jti = uuidv4();
    
    // Access token - 15 minutes
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        org_id: user.organizationId,
        roles: [user.organizationRole],
        jti,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      },
      {
        secret: process.env.JWT_SECRET,
      }
    );

    // Refresh token - random string
    const refreshToken = randomBytes(32).toString('hex');
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // Store refresh token
    await this.refreshTokenRepository.save({
      user_id: user.id,
      token: hashedRefreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(oldRefreshToken: string): Promise<TokenPair> {
    // Find and validate old token
    const tokens = await this.refreshTokenRepository.find({
      where: { expires_at: MoreThan(new Date()) },
    });

    let validToken = null;
    for (const token of tokens) {
      if (await bcrypt.compare(oldRefreshToken, token.token)) {
        validToken = token;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    await this.refreshTokenRepository.delete(validToken.id);

    // Generate new token pair
    const user = await this.userRepository.findOne({ where: { id: validToken.userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user);
  }

  async revokeAllTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ user_id: userId });
    
    // Add to revocation list if Redis is available
    if (this.redis) {
      try {
        await this.redis.setex(`revoked:user:${userId}`, 7 * 24 * 60 * 60, '1');
      } catch (error) {
        console.warn('Failed to add user to revocation list:', error.message);
      }
    }
  }

  async verifyAccessToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
        clockTimestamp: Math.floor(Date.now() / 1000),
        clockTolerance: 60, // 60 seconds tolerance
      });

      // Check if user's tokens are revoked (only if Redis is available)
      if (this.redis) {
        try {
          const isRevoked = await this.redis.get(`revoked:user:${payload.sub}`);
          if (isRevoked) {
            throw new UnauthorizedException('Token revoked');
          }
        } catch (error) {
          console.warn('Failed to check token revocation:', error.message);
          // Continue without revocation check if Redis fails
        }
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async revokeToken(jti: string): Promise<void> {
    // Add JTI to revocation list if Redis is available
    if (this.redis) {
      try {
        await this.redis.setex(`revoked:jti:${jti}`, 7 * 24 * 60 * 60, '1');
      } catch (error) {
        console.warn('Failed to revoke token:', error.message);
      }
    }
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      const isRevoked = await this.redis.get(`revoked:jti:${jti}`);
      return !!isRevoked;
    } catch (error) {
      console.warn('Failed to check token revocation:', error.message);
      return false;
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    // Delete expired refresh tokens
    await this.refreshTokenRepository.delete({
      expires_at: MoreThan(new Date()),
    });
  }
}
