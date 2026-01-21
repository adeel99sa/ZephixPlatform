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
    // Respect TYPEORM_LOGGING env override if set
    if (process.env.TYPEORM_LOGGING !== undefined) {
      if (process.env.TYPEORM_LOGGING === 'false') {
        return false;
      }
      if (process.env.TYPEORM_LOGGING === 'true') {
        return ['error', 'warn', 'query', 'schema'];
      }
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
