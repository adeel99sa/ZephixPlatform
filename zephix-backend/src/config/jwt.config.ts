import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface JWTConfig {
  algorithm: 'HS256' | 'RS256';
  secret?: string;
  publicKey?: string;
  privateKey?: string;
  expiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
}

@Injectable()
export class JWTConfigService {
  private readonly config: JWTConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadJWTConfig();
  }

  private loadJWTConfig(): JWTConfig {
    const algorithm = this.configService.get<string>('JWT_ALGORITHM', 'HS256') as 'HS256' | 'RS256';
    
    if (algorithm === 'RS256') {
      return this.loadRS256Config();
    } else {
      return this.loadHS256Config();
    }
  }

  private loadHS256Config(): JWTConfig {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required for HS256 algorithm');
    }

    return {
      algorithm: 'HS256',
      secret,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      refreshExpiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      issuer: this.configService.get<string>('JWT_ISSUER', 'zephix-backend'),
      audience: this.configService.get<string>('JWT_AUDIENCE', 'zephix-frontend'),
    };
  }

  private loadRS256Config(): JWTConfig {
    // Try to load keys from environment variables first
    let privateKey = this.configService.get<string>('JWT_PRIVATE_KEY');
    let publicKey = this.configService.get<string>('JWT_PUBLIC_KEY');

    // If not in environment, try to load from files
    if (!privateKey || !publicKey) {
      const keysPath = this.configService.get<string>('JWT_KEYS_PATH', './jwt-keys');
      
      try {
        const privateKeyPath = path.join(keysPath, 'private.pem');
        const publicKeyPath = path.join(keysPath, 'public.pem');

        if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
          privateKey = fs.readFileSync(privateKeyPath, 'utf8');
          publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        } else {
          // Generate new keys if they don't exist
          const keys = this.generateRSAKeyPair();
          this.saveRSAKeyPair(keysPath, keys);
          privateKey = keys.privateKey;
          publicKey = keys.publicKey;
        }
      } catch (error) {
        throw new Error(`Failed to load RSA keys: ${error.message}`);
      }
    }

    return {
      algorithm: 'RS256',
      privateKey,
      publicKey,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      refreshExpiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      issuer: this.configService.get<string>('JWT_ISSUER', 'zephix-backend'),
      audience: this.configService.get<string>('JWT_AUDIENCE', 'zephix-frontend'),
    };
  }

  private generateRSAKeyPair(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { privateKey, publicKey };
  }

  private saveRSAKeyPair(keysPath: string, keys: { privateKey: string; publicKey: string }): void {
    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(keysPath)) {
        fs.mkdirSync(keysPath, { recursive: true });
      }

      const privateKeyPath = path.join(keysPath, 'private.pem');
      const publicKeyPath = path.join(keysPath, 'public.pem');

      fs.writeFileSync(privateKeyPath, keys.privateKey, { mode: 0o600 }); // Read/write for owner only
      fs.writeFileSync(publicKeyPath, keys.publicKey, { mode: 0o644 }); // Read for all, write for owner

      console.log(`🔐 RSA key pair generated and saved to ${keysPath}`);
    } catch (error) {
      console.error(`Failed to save RSA keys: ${error.message}`);
      throw error;
    }
  }

  getConfig(): JWTConfig {
    return this.config;
  }

  getAlgorithm(): 'HS256' | 'RS256' {
    return this.config.algorithm;
  }

  getSecret(): string | undefined {
    return this.config.secret;
  }

  getPublicKey(): string | undefined {
    return this.config.publicKey;
  }

  getPrivateKey(): string | undefined {
    return this.config.privateKey;
  }

  getExpiresIn(): string {
    return this.config.expiresIn;
  }

  getRefreshExpiresIn(): string {
    return this.config.refreshExpiresIn;
  }

  getIssuer(): string {
    return this.config.issuer;
  }

  getAudience(): string {
    return this.config.audience;
  }

  isRS256(): boolean {
    return this.config.algorithm === 'RS256';
  }

  isHS256(): boolean {
    return this.config.algorithm === 'HS256';
  }
}
