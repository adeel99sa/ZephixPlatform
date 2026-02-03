import { DataSource } from 'typeorm';
import { join } from 'path';

/**
 * DataSource for running migrations in production (Railway, etc.).
 * Used only by: npm run db:migrate → typeorm migration:run -d dist/src/config/data-source-migrate.js
 *
 * When compiled, this file lives at dist/src/config/data-source-migrate.js,
 * so __dirname is dist/src/config and ../../migrations = dist/migrations
 * (where build:migrations outputs migration .js files).
 */
const url = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL or PRODUCTION_DATABASE_URL is required for migrations');
}

const MigrateDataSource = new DataSource({
  type: 'postgres',
  url,
  entities: [],
  migrations: [join(__dirname, '../../migrations/*.js')],
  synchronize: false,
  logging: process.env.MIGRATION_LOGGING === 'true',
  ssl: url.includes('railway') ? { rejectUnauthorized: false } : false,
});

export default MigrateDataSource;
