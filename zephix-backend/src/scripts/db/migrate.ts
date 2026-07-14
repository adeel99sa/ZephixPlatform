/**
 * Database Migration Script
 * Runs TypeORM migrations for CI/CD workflows.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';

async function runMigrations() {
  console.log('🚀 Running database migrations...\n');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
    migrations: [path.join(__dirname, '../../migrations/*.js')],
    migrationsTableName: 'typeorm_migrations',
    // CI-RED-1: MUST mirror production's migration transaction mode. Production
    // deploys via data-source-migrate (migrationsTransactionMode: 'each'), which
    // commits each migration in its own transaction — so an ADD VALUE in one
    // migration is visible to a later migration that uses it (160 adds enum
    // 'lean', 170 backfills with it). The default here was 'all' (one txn for
    // every migration), which collides them: "unsafe use of new value 'lean'".
    // This validation must mirror the mode production runs, or it reports
    // failures production does not have.
    migrationsTransactionMode: 'each',
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // Ensure uuid-ossp extension is available (required for uuid_generate_v4)
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ uuid-ossp extension ensured\n');

    const pendingMigrations = await dataSource.showMigrations();
    if (pendingMigrations) {
      console.log('📋 Pending migrations found, running...\n');
    } else {
      console.log('✅ No pending migrations\n');
    }

    const migrations = await dataSource.runMigrations();
    
    if (migrations.length > 0) {
      console.log(`✅ Executed ${migrations.length} migration(s):`);
      migrations.forEach((m) => console.log(`   - ${m.name}`));
    } else {
      console.log('✅ All migrations already applied');
    }

    await dataSource.destroy();
    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    try {
      await dataSource.destroy();
    } catch {
      // ignore cleanup errors
    }
    process.exit(1);
  }
}

runMigrations();
