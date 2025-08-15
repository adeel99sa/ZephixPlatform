#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function verifyDatabase() {
  console.log('🔍 Verifying database schema...');
  
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Check required tables
    const requiredTables = [
      'users',
      'organizations', 
      'user_organizations',
      'projects',
      'teams',
      'team_members',
      'roles',
      'brds'
    ];

    console.log('\n📋 Checking required tables:');
    for (const table of requiredTables) {
      try {
        const result = await dataSource.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
          [table]
        );
        const exists = result[0].exists;
        console.log(`  ${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
        
        if (exists) {
          // Check table structure
          const columns = await dataSource.query(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
            [table]
          );
          console.log(`    Columns: ${columns.map(c => `${c.column_name}(${c.data_type})`).join(', ')}`);
        }
      } catch (error) {
        console.log(`  ❌ ${table}: ERROR - ${error.message}`);
      }
    }

    // Check foreign key constraints
    console.log('\n🔗 Checking foreign key constraints:');
    const foreignKeys = await dataSource.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    if (foreignKeys.length > 0) {
      foreignKeys.forEach(fk => {
        console.log(`  🔗 ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('  ⚠️  No foreign key constraints found');
    }

    // Check migrations table
    console.log('\n📚 Checking migrations:');
    try {
      const migrations = await dataSource.query("SELECT * FROM migrations ORDER BY timestamp");
      console.log(`  ✅ Migrations table exists with ${migrations.length} entries`);
      migrations.forEach(migration => {
        console.log(`    - ${migration.name} (${migration.timestamp})`);
      });
    } catch (error) {
      console.log('  ❌ Migrations table missing or inaccessible');
    }

  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }

  console.log('\n✅ Database verification complete!');
}

verifyDatabase().catch(console.error);
