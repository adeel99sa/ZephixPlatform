import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  type: 'postgres';
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  entities: any[];
  synchronize: boolean;
  logging: boolean | string[];
  ssl?: any;
  extra?: any;
  retryAttempts: number;
  retryDelay: number;
  retryAttemptsTimeout?: number;
  keepConnectionAlive: boolean;
  autoLoadEntities?: boolean;
  maxQueryExecutionTime?: number;
  migrationsRun?: boolean;
  migrations?: any[];
  logger?: string;
}

export const createDatabaseConfig = (
  configService: ConfigService,
): DatabaseConfig => {
  const databaseUrl = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  if (databaseUrl) {
    // Railway production configuration - ENHANCED for crash prevention
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: [], // Will be loaded by TypeORM
      synchronize: configService.get('database.synchronize') ?? false,
      logging: isProduction
        ? ['error', 'warn']
        : (configService.get('database.logging') ?? false),
      ssl: {
        rejectUnauthorized: false, // Accept Railway's self-signed certificates
        ca: process.env.DATABASE_CA_CERT, // Optional: Custom CA certificate
      },
      extra: {
        // CRITICAL: Reduced connection pool for Railway stability
        max: 5, // Reduced from 10 to prevent connection exhaustion
        min: 1, // Reduced from 2 to minimize resource usage
        acquire: 30000, // Reduced to 30s for faster failure detection
        idle: 5000, // Reduced to 5s for better resource management

        // CRITICAL FIX: Force IPv4 connections to prevent IPv6 timeouts
        family: 4, // Force IPv4 - prevents "connect ETIMEDOUT fd12:..." errors

        // Enhanced timeout settings for Railway
        connectTimeoutMS: 30000, // 30s connection timeout
        acquireTimeoutMillis: 30000, // 30s acquire timeout
        timeout: 30000, // 30s query timeout

        // Connection keep-alive settings
        keepConnectionAlive: true,
        keepAlive: true,
        keepAliveInitialDelayMillis: 5000,

        // Enhanced SSL settings for Railway
        ssl: {
          rejectUnauthorized: false, // Accept Railway's self-signed certificates
          ca: process.env.DATABASE_CA_CERT, // Optional: Custom CA certificate
        },

        // CRITICAL: Statement timeout to prevent hanging queries
        statement_timeout: 30000, // 30s statement timeout
        query_timeout: 30000, // 30s query timeout
      },

      // ENHANCED: More conservative retry configuration
      retryAttempts: 10, // Reduced from 15 to prevent excessive retries
      retryDelay: 3000, // Reduced from 5000 to 3000ms
      retryAttemptsTimeout: 180000, // 3min total retry timeout

      // Connection validation and health checks
      keepConnectionAlive: true,
      autoLoadEntities: true,

      // Query optimization and monitoring
      maxQueryExecutionTime: 15000, // Reduced to 15s max query time

      // Migration settings - DISABLED for production stability
      migrationsRun: false,
      migrations: [],

      // Enhanced logging for debugging crashes
      logger: isProduction ? 'simple-console' : 'advanced-console',
    };
  } else {
    // Local development configuration
    return {
      type: 'postgres',
      host: configService.get('database.host'),
      port: configService.get('database.port'),
      username: configService.get('database.username'),
      password: configService.get('database.password'),
      database: configService.get('database.database'),
      entities: [], // Will be loaded by TypeORM
      synchronize: configService.get('database.synchronize') ?? false,
      logging: configService.get('database.logging') ?? false,
      extra: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
        family: 4, // Force IPv4 for local development too
      },
      retryAttempts: 5,
      retryDelay: 3000,
      keepConnectionAlive: true,
    };
  }
};

// Enhanced exponential backoff retry function
export const exponentialBackoff = (
  attempt: number,
  baseDelay: number = 1000,
): number => {
  return Math.min(baseDelay * Math.pow(2, attempt), 15000); // Reduced max delay to 15s
};

// Enhanced connection retry wrapper with better error handling
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = 5,
  baseDelay: number = 1000,
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Database operation failed (attempt ${attempt + 1}/${maxAttempts}):`,
        error,
      );

      // Enhanced error logging for crash analysis
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }

      if (attempt < maxAttempts - 1) {
        const delay = exponentialBackoff(attempt, baseDelay);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};

// Database health check function
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    // This would be implemented with actual database connection check
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};
