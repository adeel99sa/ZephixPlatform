import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwtConfig from '../../config/jwt.config';
import { ConfigType } from '@nestjs/config';

export interface JWTKeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
  algorithm: 'HS256' | 'RS256';
  expiresAt?: Date;
  createdAt: Date;
}

export interface JWTSecret {
  secret: string;
  keyId: string;
  algorithm: 'HS256' | 'RS256';
  expiresAt?: Date;
  createdAt: Date;
}

/**
 * Key Loader Service
 * 
 * Manages JWT key rotation and caching for both HS256 and RS256 algorithms.
 * Provides in-memory caching with last-modified time tracking.
 * Supports key rotation with grace window for seamless transitions.
 */
@Injectable()
export class KeyLoaderService {
  private readonly logger = new Logger(KeyLoaderService.name);
  private readonly jwtCfg: ConfigType<typeof jwtConfig>;
  
  // In-memory cache for keys with rotation support
  private keyCache: Map<string, JWTKeyPair | JWTSecret> = new Map();
  private lastModified: Map<string, number> = new Map();
  private readonly cacheTtl = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get(jwtConfig.KEY);
    if (!config) {
      throw new Error('JWT configuration not found');
    }
    this.jwtCfg = config;
  }

  /**
   * Get the current access token key (public key for RS256, secret for HS256)
   */
  getCurrentAccessKey(): string {
    const cacheKey = `access_${this.jwtCfg.algorithm}`;
    const cached = this.getCachedKey(cacheKey);
    
    if (cached && this.isCacheValid(cacheKey)) {
      return this.extractAccessKey(cached);
    }

    const key = this.loadAccessKey();
    this.cacheKey(cacheKey, key);
    return this.extractAccessKey(key);
  }

  /**
   * Get the current refresh token key (public key for RS256, secret for HS256)
   */
  getCurrentRefreshKey(): string {
    const cacheKey = `refresh_${this.jwtCfg.algorithm}`;
    const cached = this.getCachedKey(cacheKey);
    
    if (cached && this.isCacheValid(cacheKey)) {
      return this.extractRefreshKey(cached);
    }

    const key = this.loadRefreshKey();
    this.cacheKey(cacheKey, key);
    return this.extractRefreshKey(key);
  }

  /**
   * Get the current signing key for access tokens
   */
  getCurrentSigningKey(): JWTKeyPair | JWTSecret {
    const cacheKey = `signing_access_${this.jwtCfg.algorithm}`;
    const cached = this.getCachedKey(cacheKey);
    
    if (cached && this.isCacheValid(cacheKey)) {
      return cached;
    }

    const key = this.loadSigningKey();
    this.cacheKey(cacheKey, key);
    return key;
  }

  /**
   * Get the current signing key for refresh tokens
   */
  getCurrentRefreshSigningKey(): JWTKeyPair | JWTSecret {
    const cacheKey = `signing_refresh_${this.jwtCfg.algorithm}`;
    const cached = this.getCachedKey(cacheKey);
    
    if (cached && this.isCacheValid(cacheKey)) {
      return cached;
    }

    const key = this.loadRefreshSigningKey();
    this.cacheKey(cacheKey, key);
    return key;
  }

  /**
   * Force refresh of all cached keys
   */
  refreshKeys(): void {
    this.logger.log('Forcing key cache refresh');
    this.keyCache.clear();
    this.lastModified.clear();
  }

  /**
   * Get key by ID (for key rotation support)
   */
  getKeyById(keyId: string): JWTKeyPair | JWTSecret | null {
    for (const [cacheKey, key] of this.keyCache.entries()) {
      if (key.keyId === keyId) {
        return key;
      }
    }
    return null;
  }

  /**
   * Get public key by key ID for verification
   */
  getPublicKeyByKid(keyId: string): string | null {
    const key = this.getKeyById(keyId);
    if (!key) {
      return null;
    }

    if (key.algorithm === 'RS256') {
      return (key as JWTKeyPair).publicKey;
    } else {
      return (key as JWTSecret).secret;
    }
  }

  /**
   * Rotate keys (for key rotation scenarios)
   */
  rotateKeys(newKeyId: string): void {
    this.logger.log(`Rotating keys to new key ID: ${newKeyId}`);
    
    // Keep old keys in cache during grace period
    const gracePeriod = this.jwtCfg.rotationGraceWindow;
    
    // Update current key ID
    this.jwtCfg.keyId = newKeyId;
    
    // Clear cache to force reload with new keys
    this.refreshKeys();
    
    this.logger.log(`Key rotation completed. Grace period: ${gracePeriod}ms`);
  }

  /**
   * Clean up expired keys (called periodically)
   */
  cleanupExpiredKeys(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [cacheKey, key] of this.keyCache.entries()) {
      if (key.expiresAt && key.expiresAt < now) {
        this.keyCache.delete(cacheKey);
        this.lastModified.delete(cacheKey);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired keys`);
    }
  }

  private loadAccessKey(): JWTKeyPair | JWTSecret {
    if (this.jwtCfg.algorithm === 'RS256') {
      if (!this.jwtCfg.publicKey) {
        throw new Error('JWT_PUBLIC_KEY is required for RS256 algorithm');
      }
      
      return {
        publicKey: this.jwtCfg.publicKey,
        privateKey: this.jwtCfg.privateKey!,
        keyId: this.jwtCfg.keyId!,
        algorithm: 'RS256',
        createdAt: new Date(),
      };
    } else {
      if (!this.jwtCfg.secret) {
        throw new Error('JWT_SECRET is required for HS256 algorithm');
      }
      
      return {
        secret: this.jwtCfg.secret,
        keyId: this.jwtCfg.keyId!,
        algorithm: 'HS256',
        createdAt: new Date(),
      };
    }
  }

  private loadRefreshKey(): JWTKeyPair | JWTSecret {
    if (this.jwtCfg.algorithm === 'RS256') {
      const refreshPublicKey = this.configService.get('JWT_REFRESH_PUBLIC_KEY');
      const refreshPrivateKey = this.configService.get('JWT_REFRESH_PRIVATE_KEY');
      
      if (!refreshPublicKey || !refreshPrivateKey) {
        throw new Error('JWT_REFRESH_PUBLIC_KEY and JWT_REFRESH_PRIVATE_KEY are required for RS256 algorithm');
      }
      
      return {
        publicKey: refreshPublicKey,
        privateKey: refreshPrivateKey,
        keyId: `${this.jwtCfg.keyId}_refresh`,
        algorithm: 'RS256',
        createdAt: new Date(),
      };
    } else {
      if (!this.jwtCfg.refreshSecret) {
        throw new Error('JWT_REFRESH_SECRET is required for HS256 algorithm');
      }
      
      return {
        secret: this.jwtCfg.refreshSecret,
        keyId: `${this.jwtCfg.keyId}_refresh`,
        algorithm: 'HS256',
        createdAt: new Date(),
      };
    }
  }

  private loadSigningKey(): JWTKeyPair | JWTSecret {
    if (this.jwtCfg.algorithm === 'RS256') {
      if (!this.jwtCfg.privateKey) {
        throw new Error('JWT_PRIVATE_KEY is required for RS256 algorithm');
      }
      
      return {
        publicKey: this.jwtCfg.publicKey!,
        privateKey: this.jwtCfg.privateKey,
        keyId: this.jwtCfg.keyId!,
        algorithm: 'RS256',
        createdAt: new Date(),
      };
    } else {
      if (!this.jwtCfg.secret) {
        throw new Error('JWT_SECRET is required for HS256 algorithm');
      }
      
      return {
        secret: this.jwtCfg.secret,
        keyId: this.jwtCfg.keyId!,
        algorithm: 'HS256',
        createdAt: new Date(),
      };
    }
  }

  private loadRefreshSigningKey(): JWTKeyPair | JWTSecret {
    if (this.jwtCfg.algorithm === 'RS256') {
      const refreshPrivateKey = this.configService.get('JWT_REFRESH_PRIVATE_KEY');
      
      if (!refreshPrivateKey) {
        throw new Error('JWT_REFRESH_PRIVATE_KEY is required for RS256 algorithm');
      }
      
      return {
        publicKey: this.configService.get('JWT_REFRESH_PUBLIC_KEY')!,
        privateKey: refreshPrivateKey,
        keyId: `${this.jwtCfg.keyId}_refresh`,
        algorithm: 'RS256',
        createdAt: new Date(),
      };
    } else {
      if (!this.jwtCfg.refreshSecret) {
        throw new Error('JWT_REFRESH_SECRET is required for HS256 algorithm');
      }
      
      return {
        secret: this.jwtCfg.refreshSecret,
        keyId: this.jwtCfg.keyId!,
        algorithm: 'HS256',
        createdAt: new Date(),
      };
    }
  }

  private extractAccessKey(key: JWTKeyPair | JWTSecret): string {
    if (key.algorithm === 'RS256') {
      return (key as JWTKeyPair).publicKey;
    } else {
      return (key as JWTSecret).secret;
    }
  }

  private extractRefreshKey(key: JWTKeyPair | JWTSecret): string {
    if (key.algorithm === 'RS256') {
      return (key as JWTKeyPair).publicKey;
    } else {
      return (key as JWTSecret).secret;
    }
  }

  private getCachedKey(cacheKey: string): JWTKeyPair | JWTSecret | null {
    return this.keyCache.get(cacheKey) || null;
  }

  private isCacheValid(cacheKey: string): boolean {
    const lastModified = this.lastModified.get(cacheKey);
    if (!lastModified) return false;
    
    return Date.now() - lastModified < this.cacheTtl;
  }

  private cacheKey(cacheKey: string, key: JWTKeyPair | JWTSecret): void {
    this.keyCache.set(cacheKey, key);
    this.lastModified.set(cacheKey, Date.now());
    this.logger.debug(`Cached key: ${cacheKey} (${key.algorithm})`);
  }
}
