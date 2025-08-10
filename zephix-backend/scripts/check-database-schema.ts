#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';

// Database connection configuration for Postgres-PCyp
const DATABASE_URL = 'postgresql://postgres:RRhnxMwmjPROoBcgaHZSczHAmkzvIQAZ@yamanote.proxy.rlwy.net:24845/railway';

async function checkDatabaseSchema() {
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

    // Check if migrations table exists
    console.log('\n📊 Checking if migrations table exists...');
    const migrationsTableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);
    
    console.log(`Migrations table exists: ${migrationsTableExists[0].exists}`);

    // List all tables in the database
    console.log('\n📋 All tables in database:');
    const tables = await dataSource.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    if (tables && tables.length > 0) {
      console.log('Table Name\t\tType');
      console.log('─'.repeat(40));
      tables.forEach((table: any) => {
        console.log(`${table.table_name}\t\t${table.table_type}`);
      });
      console.log(`\nTotal tables: ${tables.length}`);
    } else {
      console.log('ℹ️  No tables found in the database');
    }

    // Check database name and current user
    console.log('\n🔍 Database information:');
    const dbInfo = await dataSource.query('SELECT current_database() as db_name, current_user as user;');
    console.log(`Database: ${dbInfo[0].db_name}`);
    console.log(`User: ${dbInfo[0].user}`);

    // Check if this is a fresh database
    if (tables.length === 0) {
      console.log('\n⚠️  This appears to be a fresh database with no tables');
      console.log('💡 You may need to run migrations to create the schema');
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
  checkDatabaseSchema().catch(console.error);
}

export { checkDatabaseSchema };
