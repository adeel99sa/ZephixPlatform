import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

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
  logging:
    process.env.NODE_ENV === 'test'
      ? false
      : ['error', 'warn', 'query', 'schema'], // Disable logging in test mode
  // Add connection health check
  keepConnectionAlive: true,
  // Add connection pool settings
  poolSize: 10,
};
