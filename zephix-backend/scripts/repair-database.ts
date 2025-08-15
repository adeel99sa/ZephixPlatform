#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function repairDatabase() {
  console.log('🔧 Database Repair Tool');
  console.log('This tool will attempt to fix common database issues\n');
  
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Check if migrations table exists
    let migrationsTableExists = false;
    try {
      await dataSource.query("SELECT 1 FROM migrations LIMIT 1");
      migrationsTableExists = true;
      console.log('✅ Migrations table exists');
    } catch (error) {
      console.log('ℹ️  Migrations table missing - will be created by first migration');
    }

    // Check for missing tables and attempt to create them
    const coreTables = [
      { name: 'users', sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `},
      { name: 'organizations', sql: `
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `},
      { name: 'user_organizations', sql: `
        CREATE TABLE IF NOT EXISTS user_organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          organization_id UUID NOT NULL,
          role VARCHAR(50) DEFAULT 'member',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, organization_id)
        );
      `},
      { name: 'projects', sql: `
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          organization_id UUID NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          start_date DATE,
          end_date DATE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `}
    ];

    console.log('\n🔍 Checking and creating core tables...');
    for (const table of coreTables) {
      try {
        const exists = await dataSource.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
          [table.name]
        );
        
        if (exists[0].exists) {
          console.log(`  ✅ ${table.name}: already exists`);
        } else {
          console.log(`  🆕 ${table.name}: creating...`);
          await dataSource.query(table.sql);
          console.log(`  ✅ ${table.name}: created successfully`);
        }
      } catch (error) {
        console.log(`  ❌ ${table.name}: failed to create - ${error.message}`);
      }
    }

    // Check and fix foreign key constraints
    console.log('\n🔗 Checking foreign key constraints...');
    
    // Check if user_organizations has proper FKs
    try {
      const fkExists = await dataSource.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'user_organizations_user_id_fkey' 
          AND table_name = 'user_organizations'
        )
      `);
      
      if (!fkExists[0].exists) {
        console.log('  🔧 Adding foreign key for user_organizations.user_id...');
        await dataSource.query(`
          ALTER TABLE user_organizations 
          ADD CONSTRAINT user_organizations_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `);
        console.log('  ✅ Foreign key added for user_organizations.user_id');
      } else {
        console.log('  ✅ Foreign key for user_organizations.user_id exists');
      }
    } catch (error) {
      console.log(`  ❌ Failed to add FK for user_organizations.user_id: ${error.message}`);
    }

    // Check if user_organizations has organization FK
    try {
      const fkExists = await dataSource.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'user_organizations_organization_id_fkey' 
          AND table_name = 'user_organizations'
        )
      `);
      
      if (!fkExists[0].exists) {
        console.log('  🔧 Adding foreign key for user_organizations.organization_id...');
        await dataSource.query(`
          ALTER TABLE user_organizations 
          ADD CONSTRAINT user_organizations_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        `);
        console.log('  ✅ Foreign key added for user_organizations.organization_id');
      } else {
        console.log('  ✅ Foreign key for user_organizations.organization_id exists');
      }
    } catch (error) {
      console.log(`  ❌ Failed to add FK for user_organizations.organization_id: ${error.message}`);
    }

    // Check if projects has organization FK
    try {
      const fkExists = await dataSource.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'projects_organization_id_fkey' 
          AND table_name = 'projects'
        )
      `);
      
      if (!fkExists[0].exists) {
        console.log('  🔧 Adding foreign key for projects.organization_id...');
        await dataSource.query(`
          ALTER TABLE projects 
          ADD CONSTRAINT projects_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        `);
        console.log('  ✅ Foreign key added for projects.organization_id');
      } else {
        console.log('  ✅ Foreign key for projects.organization_id exists');
      }
    } catch (error) {
      console.log(`  ❌ Failed to add FK for projects.organization_id: ${error.message}`);
    }

    // Check for brds table and add project FK if needed
    try {
      const brdsExists = await dataSource.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'brds')"
      );
      
      if (brdsExists[0].exists) {
        console.log('  🔍 Checking BRD table foreign keys...');
        
        // Check if brds has project_id FK
        const projectFkExists = await dataSource.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%brds_project_id%' 
            AND table_name = 'brds'
          )
        `);
        
        if (!projectFkExists[0].exists) {
          console.log('  🔧 Adding project_id column and FK to brds table...');
          
          // Add project_id column if it doesn't exist
          await dataSource.query(`
            ALTER TABLE brds 
            ADD COLUMN IF NOT EXISTS project_id UUID
          `);
          
          // Add foreign key constraint
          await dataSource.query(`
            ALTER TABLE brds 
            ADD CONSTRAINT fk_brds_project_id 
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
          `);
          
          console.log('  ✅ Project foreign key added to brds table');
        } else {
          console.log('  ✅ BRD table project foreign key exists');
        }
      }
    } catch (error) {
      console.log(`  ❌ Error checking BRD table: ${error.message}`);
    }

    // Final verification
    console.log('\n🔍 Final verification...');
    const allTables = await dataSource.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`  📋 Found ${allTables.length} tables: ${allTables.map(t => t.table_name).join(', ')}`);
    
    const allFks = await dataSource.query(`
      SELECT COUNT(*) as count FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
    `);
    
    console.log(`  🔗 Found ${allFks[0].count} foreign key constraints`);

    console.log('\n✅ Database repair completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run migrations: npm run db:migrate');
    console.log('2. Verify database: npm run db:verify');
    console.log('3. Start application: npm run start:dev');

  } catch (error) {
    console.error('❌ Database repair failed:', error.message);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

repairDatabase().catch(console.error);
