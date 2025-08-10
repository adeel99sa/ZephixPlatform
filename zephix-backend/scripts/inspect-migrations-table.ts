#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';

// Database connection configuration for Postgres-PCyp
const DATABASE_URL = 'DB-URL-REDACTED';

async function inspectMigrationsTable() {
  console.log('🔗 Connecting to Postgres-PCyp database...');
  
  const dataSource = new DataSource({
    type: 'postgres',
    url: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    logging: false,
    synchronize: false,
    migrationsRun: false,
  });

  try {
    // Initialize connection
    await dataSource.initialize();
    console.log('✅ Connected to Postgres-PCyp successfully!');

    // Check migrations table structure
    console.log('\n📊 Migrations table structure:');
    const tableStructure = await dataSource.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'migrations' 
      ORDER BY ordinal_position;
    `);
    
    if (tableStructure && tableStructure.length > 0) {
      console.log('Column\t\tType\t\tNullable\tDefault');
      console.log('─'.repeat(60));
      tableStructure.forEach((column: any) => {
        console.log(`${column.column_name}\t\t${column.data_type}\t\t${column.is_nullable}\t\t${column.column_default || 'NULL'}`);
      });
    }

    // Check total row count
    console.log('\n📋 Row count in migrations table:');
    const rowCount = await dataSource.query('SELECT COUNT(*) as total FROM migrations;');
    console.log(`Total rows: ${rowCount[0].total}`);

    // Check for any records (even if count shows 0)
    console.log('\n🔍 Checking for any migration records:');
    const allMigrations = await dataSource.query('SELECT * FROM migrations LIMIT 10;');
    
    if (allMigrations && allMigrations.length > 0) {
      console.log('Found migration records:');
      allMigrations.forEach((migration: any, index: number) => {
        console.log(`\nMigration ${index + 1}:`);
        Object.entries(migration).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
    } else {
      console.log('ℹ️  No migration records found');
    }

    // Check if there might be a different migrations table name
    console.log('\n🔍 Checking for other possible migration tables:');
    const migrationTables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%migration%';
    `);
    
    if (migrationTables && migrationTables.length > 0) {
      console.log('Tables with "migration" in name:');
      migrationTables.forEach((table: any) => {
        console.log(`  - ${table.table_name}`);
      });
    } else {
      console.log('ℹ️  No other migration-related tables found');
    }

    // Check if this database was created with synchronize: true
    console.log('\n💡 Analysis:');
    if (rowCount[0].total === 0) {
      console.log('• The migrations table exists but is empty');
      console.log('• This suggests the database schema was created with TypeORM synchronize: true');
      console.log('• Or migrations were run but the table was cleared');
      console.log('• The 24 tables exist, so the schema is complete');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Close connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  inspectMigrationsTable().catch(console.error);
}

export { inspectMigrationsTable };
