/**
 * Setup "Sandbox" company with two org roles for E2E testing:
 * - Org Admin (platform ADMIN via user_organizations.admin)
 * - Org Member (platform MEMBER via user_organizations.pm)
 *
 * Also creates one open workspace and adds both users so routing and workspace
 * APIs work without manual onboarding.
 *
 * Usage (from zephix-backend):
 *   npm run setup:sandbox-org
 *
 * Env:
 *   DATABASE_URL — or DB_* fallbacks like setup-tester-org.ts
 *   SANDBOX_PASSWORD — default: SandboxE2E123!@#
 */

import { Client } from 'pg';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

config();

const ORG_NAME = process.env.SANDBOX_ORG_NAME || 'Sandbox';
const DEFAULT_PASSWORD = process.env.SANDBOX_PASSWORD || 'SandboxE2E123!@#';

/** Stable emails for local/staging; override with env if needed. */
const ADMIN_EMAIL =
  process.env.SANDBOX_ADMIN_EMAIL || 'sandbox.admin@zephix.dev';
const MEMBER_EMAIL =
  process.env.SANDBOX_MEMBER_EMAIL || 'sandbox.member@zephix.dev';

const WORKSPACE_NAME = process.env.SANDBOX_WORKSPACE_NAME || 'Main';
const WORKSPACE_SLUG = process.env.SANDBOX_WORKSPACE_SLUG || 'main';

function slugifyOrgName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  let clientConfig: {
    connectionString?: string;
    ssl?: boolean | { rejectUnauthorized: boolean };
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };

  if (databaseUrl) {
    clientConfig = {
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('railway')
        ? { rejectUnauthorized: false }
        : false,
    };
  } else {
    clientConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USERNAME || 'zephix_user',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'zephix_development',
    };
  }

  const client = new Client(clientConfig);

  try {
    console.log('Connecting to database...');
    await client.connect();

    const migrationsCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations')",
    );
    if (!migrationsCheck.rows[0]?.exists) {
      console.error('ERROR: Database tables do not exist. Run: npm run migration:run');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    let orgResult = await client.query(
      'SELECT id, name, slug FROM organizations WHERE name = $1',
      [ORG_NAME],
    );

    let orgId: string;
    let orgSlug: string;

    if (orgResult.rows.length === 0) {
      orgSlug = slugifyOrgName(ORG_NAME);
      const insert = await client.query(
        `INSERT INTO organizations (id, name, slug, status, settings, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'trial', '{}', NOW(), NOW())
         RETURNING id, slug`,
        [ORG_NAME, orgSlug],
      );
      orgId = insert.rows[0].id;
      orgSlug = insert.rows[0].slug;
      console.log(`Organization created: ${ORG_NAME} (${orgId})`);
    } else {
      orgId = orgResult.rows[0].id;
      orgSlug = orgResult.rows[0].slug;
      console.log(`Using existing organization: ${ORG_NAME} (${orgId})`);
    }

    const accounts: Array<{
      email: string;
      firstName: string;
      lastName: string;
      /** users.role — uppercase platform roles */
      userRole: string;
      /** user_organizations.role — owner | admin | pm | viewer */
      orgRole: 'admin' | 'pm';
    }> = [
      {
        email: ADMIN_EMAIL.toLowerCase(),
        firstName: 'Admin_Tester',
        lastName: '',
        userRole: 'ADMIN',
        orgRole: 'admin',
      },
      {
        email: MEMBER_EMAIL.toLowerCase(),
        firstName: 'Member_tester',
        lastName: '',
        userRole: 'MEMBER',
        orgRole: 'pm',
      },
    ];

    const userIds: { admin: string; member: string } = {
      admin: '',
      member: '',
    };

    for (const a of accounts) {
      let userResult = await client.query('SELECT id FROM users WHERE email = $1', [
        a.email,
      ]);

      let userId: string;
      if (userResult.rows.length === 0) {
        const userInsert = await client.query(
          `INSERT INTO users (
             id, email, first_name, last_name, password, role, organization_id,
             is_email_verified, email_verified_at, onboarding_completed,
             is_active, created_at, updated_at
           )
           VALUES (
             gen_random_uuid(), $1, $2, $3, $4, $5, $6,
             true, NOW(), true,
             true, NOW(), NOW()
           )
           RETURNING id`,
          [
            a.email,
            a.firstName,
            a.lastName || null,
            hashedPassword,
            a.userRole,
            orgId,
          ],
        );
        userId = userInsert.rows[0].id;
        console.log(`User created: ${a.email}`);
      } else {
        userId = userResult.rows[0].id;
        await client.query(
          `UPDATE users
           SET organization_id = $1,
               role = $2,
               first_name = $3,
               last_name = $4,
               password = $5,
               is_email_verified = true,
               email_verified_at = COALESCE(email_verified_at, NOW()),
               onboarding_completed = true,
               is_active = true,
               updated_at = NOW()
           WHERE id = $6`,
          [
            orgId,
            a.userRole,
            a.firstName,
            a.lastName || null,
            hashedPassword,
            userId,
          ],
        );
        console.log(`User updated: ${a.email}`);
      }

      if (a.orgRole === 'admin') userIds.admin = userId;
      if (a.orgRole === 'pm') userIds.member = userId;

      const uo = await client.query(
        'SELECT id FROM user_organizations WHERE user_id = $1 AND organization_id = $2',
        [userId, orgId],
      );

      if (uo.rows.length === 0) {
        await client.query(
          `INSERT INTO user_organizations (id, user_id, organization_id, role, "isActive", permissions, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, true, '{}', NOW(), NOW())`,
          [userId, orgId, a.orgRole],
        );
        console.log(`user_organizations linked: ${a.email} -> ${a.orgRole}`);
      } else {
        await client.query(
          `UPDATE user_organizations
           SET role = $1, "isActive" = true, "updatedAt" = NOW()
           WHERE user_id = $2 AND organization_id = $3`,
          [a.orgRole, userId, orgId],
        );
        console.log(`user_organizations updated: ${a.email} -> ${a.orgRole}`);
      }
    }

    if (!userIds.admin || !userIds.member) {
      throw new Error('Failed to resolve admin/member user ids');
    }

    // --- Default workspace (so both users have workspace context) ---
    let ws = await client.query(
      `SELECT id, slug FROM workspaces
       WHERE organization_id = $1 AND name = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [orgId, WORKSPACE_NAME],
    );

    let workspaceId: string;
    if (ws.rows.length === 0) {
      const wsInsert = await client.query(
        `INSERT INTO workspaces (
           id, organization_id, name, slug, is_private,
           created_by, owner_id, created_at, updated_at
         )
         VALUES (
           gen_random_uuid(), $1, $2, $3, false,
           $4, $4, NOW(), NOW()
         )
         RETURNING id, slug`,
        [orgId, WORKSPACE_NAME, WORKSPACE_SLUG, userIds.admin],
      );
      workspaceId = wsInsert.rows[0].id;
      console.log(`Workspace created: ${WORKSPACE_NAME} (${workspaceId})`);
    } else {
      workspaceId = ws.rows[0].id;
      console.log(`Using existing workspace: ${WORKSPACE_NAME} (${workspaceId})`);
    }

    const wmCols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'workspace_members'`,
    );
    const colSet = new Set(
      wmCols.rows.map((r: { column_name: string }) => r.column_name),
    );

    async function upsertMember(
      uid: string,
      role: 'workspace_owner' | 'workspace_member',
    ): Promise<void> {
      const existing = await client.query(
        `SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, uid],
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE workspace_members SET role = $1, updated_at = NOW() WHERE id = $2`,
          [role, existing.rows[0].id],
        );
        return;
      }

      if (colSet.has('organization_id')) {
        await client.query(
          `INSERT INTO workspace_members (
             id, workspace_id, user_id, organization_id, role, created_by, status, created_at, updated_at
           )
           VALUES (
             gen_random_uuid(), $1, $2, $3, $4, $5, 'active', NOW(), NOW()
           )`,
          [workspaceId, uid, orgId, role, userIds.admin],
        );
      } else {
        await client.query(
          `INSERT INTO workspace_members (
             id, workspace_id, user_id, role, created_by, status, created_at, updated_at
           )
           VALUES (
             gen_random_uuid(), $1, $2, $3, $4, 'active', NOW(), NOW()
           )`,
          [workspaceId, uid, role, userIds.admin],
        );
      }
    }

    await upsertMember(userIds.admin, 'workspace_owner');
    await upsertMember(userIds.member, 'workspace_member');
    console.log('Workspace membership ensured (admin: owner, member: member).');

    console.log('\n--- Sandbox E2E accounts ---');
    console.log(`Organization: ${ORG_NAME}  (slug: ${orgSlug})`);
    console.log(`  id: ${orgId}`);
    console.log(`Admin (org admin):  ${ADMIN_EMAIL}`);
    console.log(`Member (org member): ${MEMBER_EMAIL}`);
    console.log(`Password (both):     ${DEFAULT_PASSWORD}`);
    console.log(`Default workspace:   ${WORKSPACE_NAME} (slug: ${WORKSPACE_SLUG})`);
    console.log('\nLog in at the frontend (e.g. http://localhost:5173) with either account.');
  } catch (e) {
    console.error('Setup failed:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

void main();
