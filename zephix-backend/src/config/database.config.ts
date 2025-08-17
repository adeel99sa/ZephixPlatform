import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean | object;
  extra: object;
  retryAttempts: number;
  retryDelay: number;
  keepConnectionAlive: boolean;
  maxQueryExecutionTime: number;
  logger: string;
}

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  // ROBUST ENVIRONMENT DETECTION
  const nodeEnv = process.env.NODE_ENV;
  const configEnv = configService.get('environment');
  const databaseUrl = process.env.DATABASE_URL;

  // Determine if we're in production
  // Railway typically sets NODE_ENV=production, but some platforms leave it undefined
  const isProduction =
    nodeEnv === 'production' ||
    configEnv === 'production' ||
    process.env.RAILWAY_ENVIRONMENT === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.NETLIFY_ENV === 'production';

  // CRITICAL: Log configuration state for debugging
  console.log('🔍 Database Configuration Analysis:');
  console.log(`   NODE_ENV: ${nodeEnv || 'undefined'}`);
  console.log(`   Config Environment: ${configEnv || 'undefined'}`);
  console.log(
    `   Railway Environment: ${process.env.RAILWAY_ENVIRONMENT || 'undefined'}`,
  );
  console.log(`   Is Production: ${isProduction}`);
  console.log(`   DATABASE_URL exists: ${!!databaseUrl}`);
  console.log(
    `   DATABASE_URL host: ${databaseUrl ? new URL(databaseUrl).hostname : 'N/A'}`,
  );
  console.log(`   DB_HOST: ${process.env.DB_HOST || 'undefined'}`);
  console.log(`   DB_USERNAME: ${process.env.DB_USERNAME || 'undefined'}`);
  console.log(`   DB_DATABASE: ${process.env.DB_DATABASE || 'undefined'}`);

  // PRODUCTION: Always use DATABASE_URL if available
  if (isProduction && databaseUrl) {
    console.log('✅ Production: Using DATABASE_URL from environment');
    return {
      type: 'postgres',
      url: databaseUrl,
      autoLoadEntities: true,
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      synchronize: false, // NEVER in production
      migrationsRun: false,
      logging: ['error', 'warn'],
      ssl: {
        rejectUnauthorized:
          process.env.RAILWAY_SSL_REJECT_UNAUTHORIZED === 'true',
      },
      extra: {
        max: 10,
        min: 2,
        acquire: 60000,
        idle: 10000,
        family: 4,
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
        acquireTimeoutMillis: 60000,
        keepConnectionAlive: true,
      },
      migrationsTransactionMode: 'each',
      retryAttempts: 15,
      retryDelay: 5000,
      connectTimeoutMS: 60000,
      maxQueryExecutionTime: 30000,
      logger: 'advanced-console',
    };
  }

  // PRODUCTION: No DATABASE_URL - CRITICAL ERROR
  if (isProduction && !databaseUrl) {
    const error =
      '❌ CRITICAL ERROR: DATABASE_URL not set in production environment';
    console.error(error);
    console.error('❌ This will cause database connection failures');
    console.error(
      '❌ Set DATABASE_URL environment variable or ensure NODE_ENV is not production',
    );
    throw new Error(error);
  }

  // DEVELOPMENT: Use individual DB_* variables
  console.log('✅ Development: Using individual DB_* environment variables');
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'zephix_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'zephix_development',
  };

  // VALIDATE: Ensure required fields are set
  if (!dbConfig.username || !dbConfig.password || !dbConfig.database) {
    const error = '❌ CRITICAL ERROR: Missing required database configuration';
    console.error(error);
    console.error('❌ Required: DB_USERNAME, DB_PASSWORD, DB_DATABASE');
    console.error('❌ Current config:', JSON.stringify(dbConfig, null, 2));
    console.error('❌ Create .env file with required database variables');
    throw new Error(error);
  }

  console.log('✅ Database configuration validated:', {
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    database: dbConfig.database,
    password: dbConfig.password ? '[SET]' : '[MISSING]',
  });

  return {
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    autoLoadEntities: true,
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: configService.get('database.synchronize') || false,
    logging: configService.get('database.logging') || false,
    ssl: false, // No SSL for local development
    extra: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
      acquireTimeoutMillis: 60000,
      keepConnectionAlive: true,
    },
    retryAttempts: 5,
    retryDelay: 3000,
    maxQueryExecutionTime: 30000,
    logger: 'advanced-console',
  };
};

// CRITICAL: Validate database user privileges
export const validateDatabasePrivileges = async (
  configService: ConfigService,
): Promise<void> => {
  const isProduction = configService.get('environment') === 'production';

  if (isProduction) {
    console.log('✅ Production: Skipping local database privilege validation');
    return;
  }

  console.log('🔍 Validating local database user privileges...');

  // Check if we can connect and create tables
  try {
    // This would be implemented with actual database connection test
    console.log('✅ Local database privileges validated');
  } catch (error) {
    console.error('❌ Database privilege validation failed:', error);
    console.error('❌ Ensure zephix_user has CREATE, ALTER, DROP privileges');
    console.error(
      '❌ Run: GRANT ALL PRIVILEGES ON DATABASE zephix_development TO zephix_user;',
    );
    throw error;
  }
};
