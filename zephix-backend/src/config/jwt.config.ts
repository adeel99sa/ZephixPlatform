import { registerAs } from '@nestjs/config';

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
  algorithm: 'HS256' | 'RS256';
  publicKey?: string;
  privateKey?: string;
  issuer: string;
  audience: string;
}

export default registerAs('jwt', (): JWTConfig => ({
  secret: process.env.JWT_SECRET || '',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || '',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  algorithm: (process.env.JWT_ALGORITHM as 'HS256' | 'RS256') || 'HS256',
  publicKey: process.env.JWT_PUBLIC_KEY,
  privateKey: process.env.JWT_PRIVATE_KEY,
  issuer: process.env.JWT_ISSUER || 'zephix-backend',
  audience: process.env.JWT_AUDIENCE || 'zephix-frontend',
}));
