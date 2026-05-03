/**
 * Runs before each permission-matrix test file (see test/jest-permission-matrix.json).
 *
 * TypeORM + Jest: glob patterns for migrations and entities both trigger
 * DirectoryExportedClassesLoader (async dynamic imports), racing Jest teardown.
 *
 * CI applies schema via `npm run db:migrate` before Gate 2b. Nest uses
 * autoLoadEntities + forFeature() instead of entity globs when this flag is set.
 */
process.env.ZEPHIX_ORM_SKIP_MIGRATION_GLOBS = 'true';

/**
 * Permission-matrix boots full Nest + login; refresh-token hashing requires these.
 * CI postgres job may omit them; default only when unset or too short (never override real secrets).
 */
const PLACEHOLDER_32 = '01234567890123456789012345678901';
const PLACEHOLDER_PEPPER = 'fedcba0987654321fedcba0987654321';
if (!process.env.TOKEN_HASH_SECRET || process.env.TOKEN_HASH_SECRET.length < 32) {
  process.env.TOKEN_HASH_SECRET = PLACEHOLDER_32;
}
if (!process.env.REFRESH_TOKEN_PEPPER || process.env.REFRESH_TOKEN_PEPPER.length < 32) {
  process.env.REFRESH_TOKEN_PEPPER = PLACEHOLDER_PEPPER;
}
