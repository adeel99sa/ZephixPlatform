import { join } from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

// Log database connection details (redact password)
const dbUrl = process.env.DATABASE_URL || '';
const dbUrlMasked = dbUrl.replace(/:[^:@]+@/, ':****@');
const dbUrlObj = dbUrl ? new URL(dbUrl) : null;
console.log('🔍 Database Config:', {
  host: dbUrlObj?.hostname || 'N/A',
  port: dbUrlObj?.port || 'N/A',
  database: dbUrlObj?.pathname?.replace('/', '') || 'N/A',
  username: dbUrlObj?.username || 'N/A',
  url: dbUrlMasked,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  // Single source of truth: dist/migrations (process.cwd() is /app in Railway).
  migrations: [join(process.cwd(), 'dist/migrations/*.js')],
  migrationsTableName: 'migrations',
  synchronize: false,
  // namingStrategy: new SnakeNamingStrategy(), // Temporarily disabled for debugging
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  extra: {
    max: 10, // Increased connection limit
    min: 2, // Minimum connections
    connectionTimeoutMillis: 10000, // Increased timeout
    idleTimeoutMillis: 30000, // Idle timeout
    acquireTimeoutMillis: 10000, // Acquire timeout
  },
  retryAttempts: 5, // Increased retry attempts
  retryDelay: 5000, // Increased retry delay
  logging: (() => {
    /**
     * Helper to parse environment variable as boolean
     * Returns true only if value is explicitly "true" (case-insensitive)
     */
    const isTrue = (v?: string): boolean => (v || '').toLowerCase() === 'true';

    // Respect TYPEORM_LOGGING env override if set
    if (process.env.TYPEORM_LOGGING !== undefined) {
      if (isTrue(process.env.TYPEORM_LOGGING)) {
        return ['error', 'warn', 'query', 'schema'];
      }
      // Any other value (including "false") disables logging
      return false;
    }
    // Default behavior: disable in test, minimal in production, full in development
    if (process.env.NODE_ENV === 'test') {
      return false;
    }
    if (process.env.NODE_ENV === 'production') {
      return false; // Disable query logging in production by default
    }
    // Development: full logging
    return ['error', 'warn', 'query', 'schema'];
  })(),
  // Add connection health check
  keepConnectionAlive: true,
  // Add connection pool settings
  poolSize: 10,
};
