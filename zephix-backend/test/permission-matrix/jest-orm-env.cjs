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
