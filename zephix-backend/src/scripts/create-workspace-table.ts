import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function createWorkspaceTable() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // Create table first
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "workspaces" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orgId" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "slug" character varying(120) NOT NULL,
        "isPrivate" boolean NOT NULL DEFAULT false,
        "ownerUserId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspaces" PRIMARY KEY ("id")
      )
    `);
    console.log('✅ Workspace table created');

    // Create index
    try {
      await dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_workspaces_org_slug" ON "workspaces" ("orgId", "slug")
      `);
      console.log('✅ Workspace index created');
    } catch (error) {
      console.log('⚠️ Index might already exist:', error.message);
    }

    // Add foreign key constraints
    try {
      await dataSource.query(`
        ALTER TABLE "workspaces"
        ADD CONSTRAINT "FK_workspaces_org"
        FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE
      `);
      console.log('✅ Organization foreign key added');
    } catch (error) {
      console.log(
        '⚠️ Organization foreign key might already exist:',
        error.message,
      );
    }

    try {
      await dataSource.query(`
        ALTER TABLE "workspaces"
        ADD CONSTRAINT "FK_workspaces_owner"
        FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL
      `);
      console.log('✅ Owner foreign key added');
    } catch (error) {
      console.log('⚠️ Owner foreign key might already exist:', error.message);
    }

    // Check if table exists and show its structure
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'workspaces'
      )
    `);
    console.log('Table exists:', tableExists[0].exists);

    if (tableExists[0].exists) {
      const columns = await dataSource.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'workspaces'
        ORDER BY ordinal_position
      `);
      console.log('Table columns:', columns);
    }

    console.log('✅ Workspace table setup completed');
  } catch (error) {
    console.error('❌ Error creating workspace table:', error);
  } finally {
    await dataSource.destroy();
  }
}

createWorkspaceTable();
