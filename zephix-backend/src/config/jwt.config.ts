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
  refreshAudience: string;
  keyId?: string;
  rotationGraceWindow: number; // milliseconds
}

export default registerAs('jwt', (): JWTConfig => {
  const algorithm = (process.env.JWT_ALG || 'HS256') as 'HS256' | 'RS256';
  
  // Validate required fields based on algorithm
  if (algorithm === 'HS256') {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required for HS256 algorithm');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET is required for HS256 algorithm');
    }
  } else if (algorithm === 'RS256') {
    if (!process.env.JWT_PUBLIC_KEY) {
      throw new Error('JWT_PUBLIC_KEY is required for RS256 algorithm');
    }
    if (!process.env.JWT_PRIVATE_KEY) {
      throw new Error('JWT_PRIVATE_KEY is required for RS256 algorithm');
    }
    if (!process.env.JWT_REFRESH_PUBLIC_KEY) {
      throw new Error('JWT_REFRESH_PUBLIC_KEY is required for RS256 algorithm');
    }
    if (!process.env.JWT_REFRESH_PRIVATE_KEY) {
      throw new Error('JWT_REFRESH_PRIVATE_KEY is required for RS256 algorithm');
    }
  }

  // Normalize PEM keys (handle base64 and multiline)
  const normalizePemKey = (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    
    let normalizedKey: string;
    
    // If it's base64, decode it
    if (!key.includes('-----BEGIN')) {
      try {
        normalizedKey = Buffer.from(key, 'base64').toString('utf8');
      } catch {
        throw new Error('Invalid base64 encoded key');
      }
    } else {
      normalizedKey = key;
    }
    
    // Normalize line breaks and trim
    normalizedKey = normalizedKey
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
    
    // Ensure proper PEM format
    if (!normalizedKey.startsWith('-----BEGIN') || !normalizedKey.endsWith('-----')) {
      throw new Error('Invalid PEM key format');
    }
    
    // Ensure key content exists
    const keyContent = normalizedKey.split('\n').slice(1, -1).join('');
    if (!keyContent || keyContent.trim().length === 0) {
      throw new Error('PEM key contains no content');
    }
    
    // Add trailing newline for proper PEM format (OpenSSL requirement)
    if (!normalizedKey.endsWith('\n')) {
      normalizedKey += '\n';
    }
    
    return normalizedKey;
  };

  return {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm,
    publicKey: normalizePemKey(process.env.JWT_PUBLIC_KEY),
    privateKey: normalizePemKey(process.env.JWT_PRIVATE_KEY),
    issuer: process.env.JWT_ISSUER || 'zephix-backend',
    audience: process.env.JWT_AUDIENCE || 'zephix-frontend',
    refreshAudience: process.env.JWT_REFRESH_AUDIENCE || 'zephix-refresh',
    keyId: process.env.JWT_KEY_ID || `key_${Date.now()}`,
    rotationGraceWindow: parseInt(process.env.JWT_ROTATION_GRACE_WINDOW || '300000'), // 5 minutes
  };
});
