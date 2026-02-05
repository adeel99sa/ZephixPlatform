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
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

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
