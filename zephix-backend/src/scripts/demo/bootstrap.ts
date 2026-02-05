/**
 * Demo Bootstrap Script
 * Seeds minimal demo data for CI smoke tests.
 * 
 * This script is called by CI workflows to ensure demo data exists
 * before running smoke tests.
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.log('⚠️  DATABASE_URL not set, skipping demo bootstrap');
    process.exit(0);
  }

  console.log('🚀 Demo Bootstrap: Setting up demo data for CI...');

  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // Create demo organization (check first, no ON CONFLICT)
    let orgId: string;
    const existingOrg = await dataSource.query(`
      SELECT id FROM organizations WHERE slug = 'demo-org' LIMIT 1
    `);
    if (existingOrg.length > 0) {
      orgId = existingOrg[0].id;
      console.log('✅ Demo organization already exists:', orgId);
    } else {
      const orgResult = await dataSource.query(`
        INSERT INTO organizations (id, name, slug, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Demo Organization', 'demo-org', NOW(), NOW())
        RETURNING id
      `);
      orgId = orgResult[0].id;
      console.log('✅ Demo organization created:', orgId);
    }

    // Create demo user with hashed password (check first, no ON CONFLICT)
    const passwordHash = await bcrypt.hash('demo123!', 10);
    let userId: string;
    const existingUser = await dataSource.query(`
      SELECT id FROM users WHERE email = 'demo@zephix.io' LIMIT 1
    `);
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log('✅ Demo user already exists:', userId);
    } else {
      const userInsertResult = await dataSource.query(`
        INSERT INTO users (id, email, password, first_name, last_name, email_verified_at, created_at, updated_at)
        VALUES (gen_random_uuid(), 'demo@zephix.io', $1, 'Demo', 'User', NOW(), NOW(), NOW())
        RETURNING id
      `, [passwordHash]);
      userId = userInsertResult[0].id;
      console.log('✅ Demo user created:', userId);
    }

    // Link user to organization (check first, then insert if not exists)
    // Note: DB may have both camelCase (userId) and snake_case (user_id) columns 
    // depending on migration state. Check with either and insert into both.
    const existingLink = await dataSource.query(`
      SELECT id FROM user_organizations 
      WHERE (
        ("userId" IS NOT NULL AND "userId" = $1) OR 
        (user_id IS NOT NULL AND user_id = $1)
      ) AND (
        ("organizationId" IS NOT NULL AND "organizationId" = $2) OR 
        (organization_id IS NOT NULL AND organization_id = $2)
      )
      LIMIT 1
    `, [userId, orgId]);
    
    if (existingLink.length === 0) {
      // Dynamically determine which columns exist and insert appropriately
      const columns = await dataSource.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'user_organizations' AND column_name IN ('userId', 'user_id', 'organizationId', 'organization_id')
      `);
      const columnNames = columns.map((c: { column_name: string }) => c.column_name);
      
      const hasUserIdCamel = columnNames.includes('userId');
      const hasUserIdSnake = columnNames.includes('user_id');
      const hasOrgIdCamel = columnNames.includes('organizationId');
      const hasOrgIdSnake = columnNames.includes('organization_id');
      
      // Build dynamic INSERT
      const insertCols: string[] = [];
      const values: string[] = [];
      let paramIdx = 1;
      
      if (hasUserIdCamel) { insertCols.push('"userId"'); values.push(`$${paramIdx++}`); }
      if (hasUserIdSnake) { insertCols.push('user_id'); values.push(`$${paramIdx++}`); }
      if (hasOrgIdCamel) { insertCols.push('"organizationId"'); values.push(`$${paramIdx++}`); }
      if (hasOrgIdSnake) { insertCols.push('organization_id'); values.push(`$${paramIdx++}`); }
      insertCols.push('role');
      values.push(`$${paramIdx}`);
      
      // Build params array: userId for each user column, orgId for each org column, then role
      const params: (string | null)[] = [];
      if (hasUserIdCamel) params.push(userId);
      if (hasUserIdSnake) params.push(userId);
      if (hasOrgIdCamel) params.push(orgId);
      if (hasOrgIdSnake) params.push(orgId);
      params.push('admin');
      
      await dataSource.query(
        `INSERT INTO user_organizations (${insertCols.join(', ')}) VALUES (${values.join(', ')})`,
        params
      );
    }
    console.log('✅ User linked to organization');

    // Create demo workspace (check first, no ON CONFLICT)
    let workspaceId: string;
    const existingWorkspace = await dataSource.query(`
      SELECT id FROM workspaces WHERE slug = 'demo-workspace' AND organization_id = $1 LIMIT 1
    `, [orgId]);
    if (existingWorkspace.length > 0) {
      workspaceId = existingWorkspace[0].id;
      console.log('✅ Demo workspace already exists:', workspaceId);
    } else {
      const workspaceResult = await dataSource.query(`
        INSERT INTO workspaces (id, name, slug, organization_id, owner_id, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Demo Workspace', 'demo-workspace', $1, $2, NOW(), NOW())
        RETURNING id
      `, [orgId, userId]);
      workspaceId = workspaceResult[0].id;
      console.log('✅ Demo workspace created:', workspaceId);
    }

    console.log('\n🎉 Demo bootstrap complete!');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Demo bootstrap failed:', error);
    try {
      await dataSource.destroy();
    } catch {
      // ignore cleanup errors
    }
    process.exit(1);
  }
}

bootstrap();
