import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
config();

// Explicit migration paths for better control and Railway compatibility
const getMigrationPaths = (): string[] => {
  const baseDir = __dirname;
  
  // Explicit migration paths in dependency order
  const migrationPaths = [
    // Foundation migrations (must run first)
    path.join(baseDir, 'database/migrations/1700000000000-ResetMigrationState.js'),
    path.join(baseDir, 'database/migrations/1700000000001-CreateMultiTenancy.js'),
    path.join(baseDir, 'database/migrations/1700000000002-CreateAuthTables.js'),
    
    // Core business migrations
    path.join(baseDir, 'database/migrations/1704123600000-CreateWorkflowFramework.js'),
    path.join(baseDir, 'database/migrations/1710000000000-CreateDashboardSystem.js'),
    
    // Feature migrations
    path.join(baseDir, 'database/migrations/1735598000000-AddAIGenerationToIntakeForms.js'),
    path.join(baseDir, 'database/migrations/1755044971817-StatusReporting.js'),
    path.join(baseDir, 'database/migrations/1755044976000-AddEmailVerificationColumns.js'),
    path.join(baseDir, 'database/migrations/1755044977000-CreateEmailVerificationsTable.js'),
    
    // Consolidated migration (if exists)
    path.join(baseDir, 'database/migrations/*ConsolidatedDatabaseSchema.js'),
  ];
  
  // Filter out non-existent files and add wildcard for any additional migrations
  const existingPaths = migrationPaths.filter(path => {
    try {
      return require('fs').existsSync(path.replace('*.js', ''));
    } catch {
      return false;
    }
  });
  
  // Add wildcard for any additional migrations
  existingPaths.push(path.join(baseDir, 'database/migrations/*.js'));
  
  return existingPaths;
};

// Railway-optimized database configuration
const getRailwayConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // Railway-specific optimizations
    extra: {
      max: 10, // Connection pool size for Railway limits
      min: 2,
      acquire: 60000, // 60s acquire timeout for Railway delays
      idle: 10000,
      family: 4, // Force IPv4 - CRITICAL for Railway networking
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
      // Railway-specific connection handling
      keepAlive: true,
      keepAliveInitialDelay: 30000,
    },
    // Migration configuration
    migrationsTransactionMode: 'each' as const, // Each migration in its own transaction
    retryAttempts: 15, // More retries for Railway platform stability
    retryDelay: 5000, // 5s delay between retries
    connectTimeoutMS: 60000, // 60s connection timeout
    acquireTimeoutMillis: 60000, // 60s acquire timeout
    keepConnectionAlive: true,
    // SSL configuration for Railway
    ssl: isProduction ? true : false,
    // Logging configuration
    logging: isProduction ? ['error', 'warn'] as const : true,
  };
};

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  
  // Relying on DATABASE_URL is standard for cloud providers like Railway
  url: process.env.DATABASE_URL,
  
  // Explicit entity paths for better control
  entities: [
    __dirname + '/modules/**/*.entity{.ts,.js}',
    __dirname + '/auth/**/*.entity{.ts,.js}',
    __dirname + '/organizations/**/*.entity{.ts,.js}',
    __dirname + '/projects/**/*.entity{.ts,.js}',
    __dirname + '/pm/**/*.entity{.ts,.js}',
    __dirname + '/brd/**/*.entity{.ts,.js}',
  ],
  
  // Explicit migration paths with proper ordering
  migrations: getMigrationPaths(),
  
  // Never use synchronize in production
  synchronize: false,
  
  // Apply Railway-specific optimizations
  ...getRailwayConfig(),
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;