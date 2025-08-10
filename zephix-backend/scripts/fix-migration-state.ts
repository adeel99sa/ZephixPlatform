#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';

// Database connection configuration for Postgres-PCyp
const DATABASE_URL = 'DB-URL-REDACTED';

async function fixMigrationState() {
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

    // Fix the migration state by inserting the missing migration record
    console.log('\n🔧 Fixing migration state...');
    console.log('Inserting: CreatePMTables1700000000002');
    
    const result = await dataSource.query(`
      INSERT INTO migrations (timestamp, name) 
      VALUES (1700000000002, 'CreatePMTables1700000000002')
      RETURNING id, timestamp, name;
    `);
    
    console.log('✅ Migration record inserted successfully:');
    console.log(`   ID: ${result[0].id}`);
    console.log(`   Timestamp: ${result[0].timestamp}`);
    console.log(`   Name: ${result[0].name}`);

    // Verify the migration is now recorded
    console.log('\n📊 Verifying migration state...');
    const migrations = await dataSource.query('SELECT timestamp, name FROM migrations ORDER BY timestamp;');
    
    if (migrations && migrations.length > 0) {
      console.log('\n📋 Current Migration History:');
      console.log('Timestamp\t\t\tName');
      console.log('─'.repeat(80));
      migrations.forEach((migration: any) => {
        console.log(`${migration.timestamp}\t${migration.name}`);
      });
      console.log(`\nTotal migrations: ${migrations.length}`);
    } else {
      console.log('ℹ️  Still no migrations found');
    }

    console.log('\n🎯 Migration state has been fixed!');
    console.log('The backend should now recognize that migrations are up to date.');

  } catch (error) {
    console.error('❌ Error fixing migration state:', error);
    
    // Check if it's a duplicate key error
    if (error.message && error.message.includes('duplicate key')) {
      console.log('\n💡 The migration already exists - this is fine!');
      console.log('Let\'s check the current state:');
      
      try {
        const migrations = await dataSource.query('SELECT timestamp, name FROM migrations ORDER BY timestamp;');
        if (migrations && migrations.length > 0) {
          console.log('\n📋 Current Migration History:');
          migrations.forEach((migration: any) => {
            console.log(`${migration.timestamp}\t${migration.name}`);
          });
        }
      } catch (checkError) {
        console.error('Error checking migrations:', checkError);
      }
    }
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
  fixMigrationState().catch(console.error);
}

export { fixMigrationState };
