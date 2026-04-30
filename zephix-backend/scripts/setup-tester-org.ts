/**
 * Setup Clean Organization for Testers
 *
 * This script creates a fresh organization for testers with no demo workspaces.
 * Option A: Clean org for testers
 *
 * Uses raw SQL for reliability - doesn't require full TypeORM entity graph.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/setup-tester-org.ts
 */

import { Client } from 'pg';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

config();

async function setupTesterOrg() {
  // Use DATABASE_URL if available (Railway), otherwise fall back to individual params
  const databaseUrl = process.env.DATABASE_URL;

  let clientConfig: any;
  if (databaseUrl) {
    // Parse DATABASE_URL for Railway
    clientConfig = {
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('railway')
        ? { rejectUnauthorized: false }
        : false,
    };
  } else {
    // Fallback to individual connection params
    clientConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USERNAME || 'zephix_user',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'zephix_development',
    };
  }

  const client = new Client(clientConfig);

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Database connected');

    // Check if migrations have been run
    const migrationsCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations')"
    );

    if (!migrationsCheck.rows[0].exists) {
      console.error('❌ ERROR: Database tables do not exist.');
      console.error('   Please run migrations first:');
      console.error('   cd zephix-backend && npm run migration:run');
      process.exit(1);
    }

    const orgName = process.env.TESTER_ORG_NAME || 'Tester Organization';
    const defaultPassword = process.env.TESTER_PASSWORD || 'Test123!@#';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create or get tester organization
    let orgResult = await client.query(
      'SELECT id, name FROM organizations WHERE name = $1',
      [orgName]
    );

    let orgId: string;
    if (orgResult.rows.length === 0) {
      console.log(`📦 Creating organization: ${orgName}`);
      const slug = orgName.toLowerCase().replace(/\s+/g, '-');
      const orgInsert = await client.query(
        `INSERT INTO organizations (id, name, slug, status, settings, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'trial', '{}', NOW(), NOW())
         RETURNING id`,
        [orgName, slug]
      );
      orgId = orgInsert.rows[0].id;
      console.log(`✅ Organization created: ${orgId}`);
    } else {
      orgId = orgResult.rows[0].id;
      console.log(`✅ Using existing organization: ${orgId}`);
    }

    // Create or update tester accounts
    const testers = [
      {
        email: 'tester-admin@zephix.ai',
        firstName: 'Tester',
        lastName: 'Admin',
        role: 'admin',
        orgRole: 'admin',
      },
      {
        email: 'tester-member@zephix.ai',
        firstName: 'Tester',
        lastName: 'Member',
        role: 'member',
        orgRole: 'member',
      },
      {
        email: 'tester-viewer@zephix.ai',
        firstName: 'Tester',
        lastName: 'Viewer',
        role: 'viewer',
        orgRole: 'viewer',
      },
    ];

    for (const testerData of testers) {
      // Check if user exists
      let userResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [testerData.email]
      );

      let userId: string;
      if (userResult.rows.length === 0) {
        console.log(`👤 Creating user: ${testerData.email}`);
        const userInsert = await client.query(
          `INSERT INTO users (id, email, first_name, last_name, password, role, organization_id, is_email_verified, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())
           RETURNING id`,
          [
            testerData.email,
            testerData.firstName,
            testerData.lastName,
            hashedPassword,
            testerData.role,
            orgId,
          ]
        );
        userId = userInsert.rows[0].id;
        console.log(`✅ User created: ${userId}`);
      } else {
        userId = userResult.rows[0].id;
        // Update existing user
        await client.query(
          `UPDATE users
           SET organization_id = $1, role = $2, updated_at = NOW()
           WHERE id = $3`,
          [orgId, testerData.role, userId]
        );
        console.log(`✅ User updated: ${testerData.email}`);
      }

      // Ensure UserOrganization record exists (snake_case columns per auth contract)
      const userOrgResult = await client.query(
        'SELECT id FROM user_organizations WHERE user_id = $1 AND organization_id = $2',
        [userId, orgId]
      );

      if (userOrgResult.rows.length === 0) {
        await client.query(
          `INSERT INTO user_organizations (id, user_id, organization_id, role, "isActive", permissions, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, true, '{}', NOW(), NOW())`,
          [userId, orgId, testerData.orgRole]
        );
        console.log(`✅ UserOrganization created for ${testerData.email}`);
      } else {
        await client.query(
          `UPDATE user_organizations
           SET role = $1, "isActive" = true, "updatedAt" = NOW()
           WHERE user_id = $2 AND organization_id = $3`,
          [testerData.orgRole, userId, orgId]
        );
        console.log(`✅ UserOrganization updated for ${testerData.email}`);
      }
    }

    // Verify no workspaces exist for this org
    const workspaceResult = await client.query(
      'SELECT id, name FROM workspaces WHERE organization_id = $1 AND deleted_at IS NULL',
      [orgId]
    );

    if (workspaceResult.rows.length > 0) {
      console.log(`⚠️  WARNING: Found ${workspaceResult.rows.length} existing workspace(s) in tester org`);
      console.log('   Workspaces:', workspaceResult.rows.map((w: any) => w.name).join(', '));
      console.log('   These should be deleted for a clean testing experience');
    } else {
      console.log('✅ No workspaces found - clean org ready for testing');
    }

    console.log('\n✅ Tester organization setup complete!');
    console.log('\n📋 Test Accounts:');
    console.log(`   Admin:  tester-admin@zephix.ai  / ${defaultPassword}`);
    console.log(`   Member: tester-member@zephix.ai  / ${defaultPassword}`);
    console.log(`   Viewer: tester-viewer@zephix.ai  / ${defaultPassword}`);
    console.log(`\n   Organization ID: ${orgId}`);
    console.log(`   Organization Name: ${orgName}`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

setupTesterOrg();
