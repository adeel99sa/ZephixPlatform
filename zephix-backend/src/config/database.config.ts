import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { getMigrationsForRuntime } from '../database/migrations.registry';

/**
 * Permission-matrix Jest sets ZEPHIX_ORM_SKIP_MIGRATION_GLOBS via jest-orm-env.cjs.
 * Schema is applied by CI `db:migrate` before tests.
 *
 * Loading migration OR entity path globs during DataSource.initialize() uses
 * DirectoryExportedClassesLoader (async dynamic imports). That races Jest sandbox
 * teardown → ReferenceError: import after Jest environment torn down.
 *
 * When this flag is set: empty migrations + Nest autoLoadEntities (entities from
 * TypeOrmModule.forFeature across modules), no glob scanning.
 */
function usePermissionMatrixJestOrmProfile(): boolean {
  return process.env.ZEPHIX_ORM_SKIP_MIGRATION_GLOBS === 'true';
}

function migrationsForTypeOrmRuntime(): string[] {
  if (usePermissionMatrixJestOrmProfile()) {
    return [];
  }
  return getMigrationsForRuntime();
}

// Log database connection only when DEBUG_BOOT=true; never log credentials or URL
if (process.env.DEBUG_BOOT === 'true') {
  const dbUrl = process.env.DATABASE_URL || '';
  const dbUrlObj = dbUrl ? new URL(dbUrl) : null;
  console.log('🔍 Database Config (DEBUG_BOOT):', {
    host: dbUrlObj?.hostname || 'N/A',
    database: dbUrlObj?.pathname?.replace(/^\//, '') || 'N/A',
  });
}

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ...(usePermissionMatrixJestOrmProfile()
    ? { entities: [], autoLoadEntities: true }
    : { entities: [__dirname + '/../**/*.entity{.ts,.js}'] }),
  migrations: migrationsForTypeOrmRuntime(),
  migrationsTableName: 'migrations',
  synchronize: false,
  // namingStrategy: new SnakeNamingStrategy(), // Temporarily disabled for debugging
  ssl:
    // Allow explicit override via DATABASE_SSL env var (for CI with NODE_ENV=production but no SSL)
    process.env.DATABASE_SSL === 'false'
      ? false
      : process.env.NODE_ENV === 'production' ||
          (process.env.DATABASE_URL || '').includes('railway')
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
  // Keep connections alive across hot-reload in dev/prod, but allow clean teardown in tests
  keepConnectionAlive: process.env.NODE_ENV !== 'test',
  // Add connection pool settings
  poolSize: 10,
};
