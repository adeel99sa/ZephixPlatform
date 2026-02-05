/**
 * Database Verification Script
 * Verifies schema matches expected state for CI/CD workflows.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AUTH_REQUIRED_TABLES, AUTH_REQUIRED_COLUMNS } from '../../modules/auth/auth-schema.contract';

async function verifyDatabase() {
  console.log('🔍 Verifying database schema...\n');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    let hasErrors = false;

    // Verify required tables exist
    console.log('📋 Checking required tables...');
    for (const table of AUTH_REQUIRED_TABLES) {
      const result = await dataSource.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [table]);
      
      if (result[0].exists) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - MISSING`);
        hasErrors = true;
      }
    }

    // Verify required columns exist
    console.log('\n📋 Checking required columns...');
    for (const { table, column } of AUTH_REQUIRED_COLUMNS) {
      const result = await dataSource.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = $2
        )
      `, [table, column]);
      
      if (result[0].exists) {
        console.log(`   ✅ ${table}.${column}`);
      } else {
        console.log(`   ❌ ${table}.${column} - MISSING`);
        hasErrors = true;
      }
    }

    // Check pending migrations
    console.log('\n📋 Checking migrations...');
    const pendingMigrations = await dataSource.showMigrations();
    if (pendingMigrations) {
      console.log('   ⚠️  Pending migrations exist');
      // Not an error, just a warning
    } else {
      console.log('   ✅ All migrations applied');
    }

    await dataSource.destroy();

    if (hasErrors) {
      console.log('\n❌ Schema verification failed!');
      process.exit(1);
    }

    console.log('\n🎉 Schema verification passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    try {
      await dataSource.destroy();
    } catch {
      // ignore cleanup errors
    }
    process.exit(1);
  }
}

verifyDatabase();
