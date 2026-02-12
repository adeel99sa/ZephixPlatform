import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';

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
  migrations: [
    join(process.cwd(), 'dist/src/migrations/*.js'),
  ],
  migrationsTableName: 'migrations',
});

export default dataSource;
