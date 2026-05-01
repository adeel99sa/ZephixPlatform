/**
 * Runs before each permission-matrix test file (see test/jest-permission-matrix.json).
 *
 * TypeORM + Jest: databaseConfig uses glob patterns for migrations; initialize() then
 * lazy-imports dozens of migration modules via DirectoryExportedClassesLoader. That
 * dynamic import can complete after Jest starts tearing down the test environment,
 * causing ReferenceError: import after Jest environment torn down.
 *
 * CI applies schema via `npm run db:migrate` before Gate 2b; Nest tests only need
 * entities + an initialized connection, not migration class metadata at runtime.
 */
process.env.ZEPHIX_ORM_SKIP_MIGRATION_GLOBS = 'true';
