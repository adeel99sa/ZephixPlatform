#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function fixRailwayDatabase() {
  console.log('🔧 Fixing Railway Database - Creating Missing Tables');
  console.log('==================================================');
  
  // Use Railway DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please set DATABASE_URL to your Railway PostgreSQL connection string');
    process.exit(1);
  }

  console.log('📡 Connecting to Railway database...');
  
  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: { rejectUnauthorized: false }, // Railway requires this
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Check what tables exist
    const existingTables = await dataSource.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Existing tables:');
    existingTables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    // Define the tables we need to create
    const requiredTables = [
      {
        name: 'roles',
        sql: `
          CREATE TABLE IF NOT EXISTS "roles" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying(100) NOT NULL,
            "description" text,
            "permissions" jsonb NOT NULL DEFAULT '{}',
            "isActive" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_roles" PRIMARY KEY ("id")
          )
        `
      },
      {
        name: 'teams',
        sql: `
          CREATE TABLE IF NOT EXISTS "teams" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying(255) NOT NULL,
            "description" text,
            "organizationId" uuid NOT NULL,
            "isActive" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_teams" PRIMARY KEY ("id")
          )
        `
      },
      {
        name: 'team_members',
        sql: `
          CREATE TABLE IF NOT EXISTS "team_members" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "teamId" uuid NOT NULL,
            "userId" uuid NOT NULL,
            "role" character varying(50) DEFAULT 'member',
            "isActive" boolean NOT NULL DEFAULT true,
            "joinedAt" TIMESTAMP DEFAULT now(),
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_team_members" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_team_members_team_user" UNIQUE ("teamId", "userId")
          )
        `
      },
      {
        name: 'brds',
        sql: `
          CREATE TABLE IF NOT EXISTS "brds" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "title" character varying(500) NOT NULL,
            "description" text,
            "content" jsonb NOT NULL DEFAULT '{}',
            "status" character varying(50) DEFAULT 'draft',
            "projectId" uuid,
            "organizationId" uuid NOT NULL,
            "createdBy" uuid NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_brds" PRIMARY KEY ("id")
          )
        `
      }
    ];

    console.log('\n🔍 Checking and creating missing tables...');
    
    for (const table of requiredTables) {
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

    // Create foreign key constraints
    console.log('\n🔗 Creating foreign key constraints...');
    
    try {
      // Teams -> Organizations
      await dataSource.query(`
        ALTER TABLE "teams" 
        ADD CONSTRAINT IF NOT EXISTS "FK_teams_organization" 
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      `);
      console.log('  ✅ Teams -> Organizations FK created');
    } catch (error) {
      console.log(`  ❌ Teams FK failed: ${error.message}`);
    }

    try {
      // Team Members -> Teams
      await dataSource.query(`
        ALTER TABLE "team_members" 
        ADD CONSTRAINT IF NOT EXISTS "FK_team_members_team" 
        FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE
      `);
      console.log('  ✅ Team Members -> Teams FK created');
    } catch (error) {
      console.log(`  ❌ Team Members -> Teams FK failed: ${error.message}`);
    }

    try {
      // Team Members -> Users
      await dataSource.query(`
        ALTER TABLE "team_members" 
        ADD CONSTRAINT IF NOT EXISTS "FK_team_members_user" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      `);
      console.log('  ✅ Team Members -> Users FK created');
    } catch (error) {
      console.log(`  ❌ Team Members -> Users FK failed: ${error.message}`);
    }

    try {
      // BRDs -> Projects
      await dataSource.query(`
        ALTER TABLE "brds" 
        ADD CONSTRAINT IF NOT EXISTS "FK_brds_project" 
        FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL
      `);
      console.log('  ✅ BRDs -> Projects FK created');
    } catch (error) {
      console.log(`  ❌ BRDs -> Projects FK failed: ${error.message}`);
    }

    try {
      // BRDs -> Organizations
      await dataSource.query(`
        ALTER TABLE "brds" 
        ADD CONSTRAINT IF NOT EXISTS "FK_brds_organization" 
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      `);
      console.log('  ✅ BRDs -> Organizations FK created');
    } catch (error) {
      console.log(`  ❌ BRDs -> Organizations FK failed: ${error.message}`);
    }

    try {
      // BRDs -> Users
      await dataSource.query(`
        ALTER TABLE "brds" 
        ADD CONSTRAINT IF NOT EXISTS "FK_brds_created_by" 
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE
      `);
      console.log('  ✅ BRDs -> Users FK created');
    } catch (error) {
      console.log(`  ❌ BRDs -> Users FK failed: ${error.message}`);
    }

    // Insert default roles
    console.log('\n👥 Inserting default roles...');
    
    try {
      const adminRoleExists = await dataSource.query(
        'SELECT COUNT(*) as count FROM "roles" WHERE "name" = $1',
        ['admin']
      );
      
      if (parseInt(adminRoleExists[0].count) === 0) {
        await dataSource.query(`
          INSERT INTO "roles" ("name", "description", "permissions", "isActive") 
          VALUES 
            ('admin', 'Administrator with full access', '{"all": true}', true),
            ('pm', 'Project Manager with project management access', '{"projects": true, "teams": true}', true),
            ('member', 'Team member with basic access', '{"view": true}', true),
            ('viewer', 'Read-only access', '{"view": true}', true)
        `);
        console.log('  ✅ Default roles inserted');
      } else {
        console.log('  ℹ️  Default roles already exist');
      }
    } catch (error) {
      console.log(`  ❌ Failed to insert default roles: ${error.message}`);
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

    console.log('\n🎉 Railway database fix completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Redeploy your Railway service');
    console.log('2. The application should now start without the "roles" table error');
    console.log('3. Monitor the logs to ensure successful startup');

  } catch (error) {
    console.error('❌ Railway database fix failed:', error.message);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

fixRailwayDatabase().catch(console.error);
