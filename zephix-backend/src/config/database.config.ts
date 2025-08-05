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

export const createDatabaseConfig = (configService: ConfigService): DatabaseConfig => {
  const databaseUrl = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  if (databaseUrl) {
    // Railway production configuration - FIXED for IPv6 timeout errors
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: [], // Will be loaded by TypeORM
      synchronize: configService.get('database.synchronize'),
      logging: isProduction ? ['error', 'warn'] : configService.get('database.logging'),
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        // Connection pool settings optimized for Railway
        max: 10,                    // Standard pool size
        min: 2,                     // Minimum connections
        acquire: 60000,             // 1min acquire timeout
        idle: 10000,               // 10s idle timeout
        
        // CRITICAL FIX: Force IPv4 connections to prevent IPv6 timeouts
        family: 4,                  // Force IPv4 - prevents "connect ETIMEDOUT fd12:..." errors
        
        // Connection timeout settings optimized for Railway
        connectTimeoutMS: 60000,    // 1min connection timeout
        acquireTimeoutMillis: 60000, // 1min acquire timeout
        timeout: 60000,            // 1min query timeout
        
        // Keep connection alive settings
        keepConnectionAlive: true,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        
        // SSL settings for Railway
        ssl: {
          rejectUnauthorized: false,
          ca: undefined,
          key: undefined,
          cert: undefined,
        },
      },
      
      // Retry configuration to handle connection issues
      retryAttempts: 15,           // 15 retry attempts for Railway stability
      retryDelay: 5000,            // 5s delay between retries
      retryAttemptsTimeout: 300000, // 5min total retry timeout
      
      // Connection validation
      keepConnectionAlive: true,
      autoLoadEntities: true,
      
      // Query optimization
      maxQueryExecutionTime: 30000, // 30s max query time
      
      // Migration settings
      migrationsRun: false,
      migrations: [],
      
      // Logging for debugging
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
      synchronize: configService.get('database.synchronize'),
      logging: configService.get('database.logging'),
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

// Exponential backoff retry function
export const exponentialBackoff = (attempt: number, baseDelay: number = 1000): number => {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30s delay
};

// Connection retry wrapper
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = 5,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Database operation failed (attempt ${attempt + 1}/${maxAttempts}):`, error);
      
      if (attempt < maxAttempts - 1) {
        const delay = exponentialBackoff(attempt, baseDelay);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}; 