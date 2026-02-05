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

    // Check if demo user exists
    const userResult = await dataSource.query(
      `SELECT id FROM users WHERE email = 'demo@zephix.io' LIMIT 1`
    );

    if (userResult.length > 0) {
      console.log('✅ Demo user already exists, skipping seed');
      await dataSource.destroy();
      process.exit(0);
    }

    // Create demo organization
    const orgResult = await dataSource.query(`
      INSERT INTO organizations (id, name, slug, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'Demo Organization',
        'demo-org',
        NOW(),
        NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `);
    const orgId = orgResult[0].id;
    console.log('✅ Demo organization created/updated:', orgId);

    // Create demo user with hashed password
    const passwordHash = await bcrypt.hash('demo123!', 10);
    const userInsertResult = await dataSource.query(`
      INSERT INTO users (id, email, password, first_name, last_name, email_verified_at, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'demo@zephix.io',
        $1,
        'Demo',
        'User',
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [passwordHash]);
    const userId = userInsertResult[0].id;
    console.log('✅ Demo user created/updated:', userId);

    // Link user to organization (check first, then insert if not exists)
    const existingLink = await dataSource.query(`
      SELECT id FROM user_organizations 
      WHERE user_id = $1 AND organization_id = $2
      LIMIT 1
    `, [userId, orgId]);
    
    if (existingLink.length === 0) {
      await dataSource.query(`
        INSERT INTO user_organizations (user_id, organization_id, role)
        VALUES ($1, $2, 'admin')
      `, [userId, orgId]);
    }
    console.log('✅ User linked to organization');

    // Create demo workspace
    const workspaceResult = await dataSource.query(`
      INSERT INTO workspaces (id, name, slug, organization_id, owner_id, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'Demo Workspace',
        'demo-workspace',
        $1,
        $2,
        NOW(),
        NOW()
      )
      ON CONFLICT (slug, organization_id) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [orgId, userId]);
    const workspaceId = workspaceResult[0].id;
    console.log('✅ Demo workspace created/updated:', workspaceId);

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
