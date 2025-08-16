// src/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';

/**
 * Enterprise-safe Postgres SSL handling
 * 
 * This file now uses the centralized SslConfigService logic
 * to ensure consistency with CoreModule configuration.
 */

// Centralized SSL configuration (same logic as SslConfigService)
function getSslConfig(): any | false {
  const DB_SSL = (process.env.DB_SSL || 'require').toLowerCase();
  const DB_SSL_STRICT = (process.env.DB_SSL_STRICT || 'false').toLowerCase() === 'true';
  
  if (DB_SSL === 'disable') {
    return false;
  }
  
  // For Railway and other cloud providers with self-signed certificates
  if (DB_SSL === 'require' || DB_SSL === 'true') {
    if (DB_SSL_STRICT) {
      // Strict mode - requires valid CA
      const DB_SSL_CA = decodeMaybeBase64(process.env.DB_SSL_CA);
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

function decodeMaybeBase64(input?: string): string | undefined {
  if (!input) return undefined;
  try {
    const decoded = Buffer.from(input, 'base64').toString('utf8');
    if (decoded.includes('-----BEGIN') && decoded.includes('-----END')) {
      return decoded;
    }
    return input;
  } catch {
    return input;
  }
}

const ssl = getSslConfig();
const hasDatabaseUrl = !!process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(hasDatabaseUrl
    ? {
        url: process.env.DATABASE_URL, // include ?sslmode=require in the URL
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }),
  ssl, // <- final authoritative SSL config for the pg driver
  
  // Entity loading - use proper glob pattern for all entities
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  
  // Runtime entity loading handled by Nest TypeOrmModule; keep migrations here:
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsRun: false,
  synchronize: false,
  logging: ['error'],
});