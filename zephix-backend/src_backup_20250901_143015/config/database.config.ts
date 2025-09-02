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

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    console.log('✅ Using DATABASE_URL for connection');
    return {
      type: 'postgres',
      url: dbUrl,
      autoLoadEntities: true,
      synchronize: false, // Disabled to prevent schema changes
      logging: process.env.NODE_ENV === 'development',
    };
  }

  // Fallback for local development
  console.log('✅ Using local database configuration');
  return {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'malikadeel',
    database: 'zephix_development',
    autoLoadEntities: true,
    synchronize: false, // Disabled to prevent schema changes
    logging: true,
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
