import { Injectable } from '@nestjs/common';

/**
 * Centralized SSL Configuration Service
 * 
 * Provides consistent SSL configuration for all database connections
 * across the application. This prevents configuration drift and ensures
 * all connections use the same SSL settings.
 */
@Injectable()
export class SslConfigService {
  
  /**
   * Get SSL configuration for PostgreSQL connections
   * 
   * @returns SSL configuration object or false if disabled
   */
  getSslConfig(): any | false {
    const DB_SSL = (process.env.DB_SSL || 'require').toLowerCase();
    const DB_SSL_STRICT = (process.env.DB_SSL_STRICT || 'false').toLowerCase() === 'true';
    
    if (DB_SSL === 'disable') {
      return false;
    }
    
    // For Railway and other cloud providers with self-signed certificates
    if (DB_SSL === 'require' || DB_SSL === 'true') {
      if (DB_SSL_STRICT) {
        // Strict mode - requires valid CA
        const DB_SSL_CA = this.decodeMaybeBase64(process.env.DB_SSL_CA);
        return {
          rejectUnauthorized: true,
          ca: DB_SSL_CA,
        };
      } else {
        // Standard mode - accepts self-signed certificates
        return {
          rejectUnauthorized: false,
        };
      }
    }
    
    // Default: accept self-signed certificates (safe for Railway)
    return {
      rejectUnauthorized: false,
    };
  }
  
  /**
   * Decode base64-encoded CA certificate or return as-is if plain PEM
   */
  private decodeMaybeBase64(input?: string): string | undefined {
    if (!input) return undefined;
    
    try {
      const decoded = Buffer.from(input, 'base64').toString('utf8');
      // If it looks like a PEM certificate, use the decoded version
      if (decoded.includes('-----BEGIN') && decoded.includes('-----END')) {
        return decoded;
      }
      // Otherwise assume it was plain PEM
      return input;
    } catch {
      // If base64 decode fails, assume it was plain PEM
      return input;
    }
  }
  
  /**
   * Validate SSL configuration for Railway compatibility
   */
  validateForRailway(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=')) {
      issues.push('DATABASE_URL should include sslmode=require for Railway');
    }
    
    if (process.env.DB_SSL === 'disable') {
      issues.push('DB_SSL=disable may cause connection issues on Railway');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
