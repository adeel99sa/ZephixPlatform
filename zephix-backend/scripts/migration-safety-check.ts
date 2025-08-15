#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

interface MigrationPrerequisite {
  table: string;
  critical: boolean;
  description: string;
}

const MIGRATION_PREREQUISITES: MigrationPrerequisite[] = [
  { table: 'users', critical: true, description: 'Core user management' },
  { table: 'organizations', critical: true, description: 'Multi-tenant organization support' },
  { table: 'user_organizations', critical: true, description: 'User-organization relationships' },
  { table: 'projects', critical: true, description: 'Project management foundation' },
  { table: 'teams', critical: false, description: 'Team management' },
  { table: 'roles', critical: false, description: 'Role-based access control' },
  { table: 'brds', critical: false, description: 'Business requirements documents' },
];

async function checkMigrationPrerequisites() {
  console.log('🔒 Checking migration prerequisites...');
  
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const missingTables: string[] = [];
    const criticalMissing: string[] = [];

    // Check each prerequisite table
    for (const prereq of MIGRATION_PREREQUISITES) {
      try {
        const result = await dataSource.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
          [prereq.table]
        );
        
        const exists = result[0].exists;
        if (exists) {
          console.log(`  ✅ ${prereq.table}: EXISTS (${prereq.description})`);
        } else {
          console.log(`  ❌ ${prereq.table}: MISSING (${prereq.description})`);
          missingTables.push(prereq.table);
          if (prereq.critical) {
            criticalMissing.push(prereq.table);
          }
        }
      } catch (error) {
        console.log(`  ❌ ${prereq.table}: ERROR - ${error.message}`);
        missingTables.push(prereq.table);
        if (prereq.critical) {
          criticalMissing.push(prereq.table);
        }
      }
    }

    // Check foreign key integrity
    console.log('\n🔗 Checking foreign key integrity...');
    try {
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
        console.log(`  ✅ Found ${foreignKeys.length} foreign key constraints`);
        foreignKeys.forEach(fk => {
          console.log(`    🔗 ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      } else {
        console.log('  ⚠️  No foreign key constraints found');
      }
    } catch (error) {
      console.log(`  ❌ Error checking foreign keys: ${error.message}`);
    }

    // Summary and recommendations
    console.log('\n📊 Migration Safety Summary:');
    if (missingTables.length === 0) {
      console.log('  ✅ All prerequisite tables exist - safe to run migrations');
    } else {
      console.log(`  ⚠️  Missing ${missingTables.length} table(s): ${missingTables.join(', ')}`);
      
      if (criticalMissing.length > 0) {
        console.log(`  🚨 CRITICAL: Missing ${criticalMissing.length} critical table(s): ${criticalMissing.join(', ')}`);
        console.log('  ❌ DO NOT RUN MIGRATIONS - critical tables missing');
        process.exit(1);
      } else {
        console.log('  ⚠️  Non-critical tables missing - migrations may fail');
        console.log('  💡 Consider running database reset: npm run db:reset');
      }
    }

    // Check migrations table
    console.log('\n📚 Checking migrations state...');
    try {
      const migrations = await dataSource.query("SELECT * FROM migrations ORDER BY timestamp");
      console.log(`  ✅ Migrations table exists with ${migrations.length} entries`);
      
      if (migrations.length > 0) {
        console.log('  📋 Recent migrations:');
        migrations.slice(-5).forEach(migration => {
          console.log(`    - ${migration.name} (${migration.timestamp})`);
        });
      }
    } catch (error) {
      console.log('  ℹ️  Migrations table missing (normal for fresh database)');
    }

  } catch (error) {
    console.error('❌ Migration safety check failed:', error.message);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }

  console.log('\n✅ Migration safety check complete!');
}

checkMigrationPrerequisites().catch(console.error);
