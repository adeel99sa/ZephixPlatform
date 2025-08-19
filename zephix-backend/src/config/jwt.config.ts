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

export default registerAs('jwt', (): JWTConfig => {
  const algorithm = (process.env.JWT_ALG || 'HS256') as 'HS256' | 'RS256';
  
  // Validate required fields based on algorithm
  if (algorithm === 'HS256') {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required for HS256 algorithm');
    }
  } else if (algorithm === 'RS256') {
    if (!process.env.JWT_PUBLIC_KEY) {
      throw new Error('JWT_PUBLIC_KEY is required for RS256 algorithm');
    }
    if (!process.env.JWT_PRIVATE_KEY) {
      throw new Error('JWT_PRIVATE_KEY is required for RS256 algorithm');
    }
  }

  return {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm,
    publicKey: process.env.JWT_PUBLIC_KEY,
    privateKey: process.env.JWT_PRIVATE_KEY,
    issuer: process.env.JWT_ISSUER || 'zephix-backend',
    audience: process.env.JWT_AUDIENCE || 'zephix-frontend',
  };
});
