import 'reflect-metadata';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { getMigrationsForRuntime } from '../database/migrations.registry';

// CLI does not load Nest's ConfigModule — read zephix-backend/.env from cwd or monorepo root.
(() => {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, '.env'),
    resolve(cwd, 'zephix-backend/.env'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      loadEnv({ path: p });
      break;
    }
  }
})();

const url = process.env.DATABASE_URL || process.env.PRODUCTION_DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL is required for migrations. Add it to zephix-backend/.env (see docs/guides/LOCAL_DEVELOPMENT_FULL_STACK.md) and run this command from zephix-backend, or export DATABASE_URL in your shell.',
  );
}

const dataSource = new DataSource({
  type: 'postgres',
  url,
  // Migrations may use queryRunner.manager.getRepository(Entity); those entities
  // must be registered here (CLI DataSource is separate from Nest TypeOrmModule).
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  ssl:
    process.env.NODE_ENV === 'production' || (url || '').includes('railway')
      ? { rejectUnauthorized: false }
      : false,
  migrations: getMigrationsForRuntime(),
  migrationsTableName: 'migrations',
});

export default dataSource;
