import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getMigrationsForRuntime } from '../database/migrations.registry';

const url = process.env.DATABASE_URL || process.env.PRODUCTION_DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required for migrations');
}

const dataSource = new DataSource({
  type: 'postgres',
  url,
  ssl:
    ['production', 'staging'].includes(process.env.NODE_ENV) ||
    (url || '').includes('railway')
      ? { rejectUnauthorized: false }
      : false,
  migrations: getMigrationsForRuntime(),
  migrationsTableName: 'migrations',
});

export default dataSource;
