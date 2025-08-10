#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';

// Database connection configuration for Postgres-PCyp
const DATABASE_URL = 'DB-URL-REDACTED';

async function queryMigrations() {
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

    // Run the migration query
    console.log('📊 Querying migrations table...');
    const result = await dataSource.query('SELECT timestamp, name FROM migrations ORDER BY timestamp;');
    
    if (result && result.length > 0) {
      console.log('\n📋 Migration History:');
      console.log('Timestamp\t\t\tName');
      console.log('─'.repeat(80));
      result.forEach((migration: any) => {
        console.log(`${migration.timestamp}\t${migration.name}`);
      });
      console.log(`\nTotal migrations: ${result.length}`);
    } else {
      console.log('ℹ️  No migrations found in the migrations table');
    }

  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    
    // Try to reconnect
    console.log('🔄 Attempting to reconnect...');
    try {
      await dataSource.destroy();
      await dataSource.initialize();
      console.log('✅ Reconnected successfully!');
      
      // Retry the query
      console.log('📊 Retrying migration query...');
      const result = await dataSource.query('SELECT timestamp, name FROM migrations ORDER BY timestamp;');
      
      if (result && result.length > 0) {
        console.log('\n📋 Migration History:');
        console.log('Timestamp\t\t\tName');
        console.log('─'.repeat(80));
        result.forEach((migration: any) => {
          console.log(`${migration.timestamp}\t${migration.name}`);
        });
        console.log(`\nTotal migrations: ${result.length}`);
      } else {
        console.log('ℹ️  No migrations found in the migrations table');
      }
      
    } catch (reconnectError) {
      console.error('❌ Reconnection failed:', reconnectError);
    }
  } finally {
    // Close connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  queryMigrations().catch(console.error);
}

export { queryMigrations };
