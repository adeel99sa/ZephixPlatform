/**
 * Create (or reset) a single org-level MEMBER test user in an existing organization.
 *
 * - users.role = MEMBER (platform)
 * - user_organizations.role = pm → PlatformRole MEMBER
 * - Adds user to the first non-deleted workspace in that org as workspace_member
 *
 * Does not create or modify org admins (safe for staging "Acme Group" style orgs).
 *
 * Usage (from zephix-backend):
 *   DATABASE_URL="postgresql://..." npm run setup:org-test-member
 *
 * Env:
 *   DATABASE_URL — required (use Railway DATABASE_PUBLIC_URL or private URL)
 *   TEST_ORG_NAME — default: Acme Group
 *   TEST_MEMBER_EMAIL — default: acme.test.member@zephix.dev
 *   TEST_MEMBER_PASSWORD — default: AcmeMemberTest123!@#
 *
 * After run, sign in on the frontend with TEST_MEMBER_EMAIL / TEST_MEMBER_PASSWORD.
 * Post-login route: same as other users — /home if onboarding_completed, else /onboarding.
 */

import { Client } from 'pg';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

config();

const ORG_NAME = process.env.TEST_ORG_NAME || 'Acme Group';
const MEMBER_EMAIL = (
  process.env.TEST_MEMBER_EMAIL || 'acme.test.member@zephix.dev'
).toLowerCase();
const MEMBER_PASSWORD =
  process.env.TEST_MEMBER_PASSWORD || 'AcmeMemberTest123!@#';

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

  if (!databaseUrl && !process.env.DB_HOST) {
    console.error('ERROR: Set DATABASE_URL (staging) or local DB_* variables.');
    process.exit(1);
  }

  const client = new Client(clientConfig);

  try {
    await client.connect();

    const orgResult = await client.query(
      'SELECT id, name, slug FROM organizations WHERE name = $1',
      [ORG_NAME],
    );
    if (orgResult.rows.length === 0) {
      console.error(`ERROR: No organization named "${ORG_NAME}".`);
      process.exit(1);
    }
    const orgId: string = orgResult.rows[0].id;
    const orgSlug: string = orgResult.rows[0].slug;
    console.log(`Organization: ${ORG_NAME} (${orgId}, slug=${orgSlug})`);

    const uoCols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'user_organizations'`,
    );
    const uoColSet = new Set(
      uoCols.rows.map((r: { column_name: string }) => r.column_name),
    );
    const uoUserCol = uoColSet.has('user_id')
      ? 'user_id'
      : uoColSet.has('userId')
        ? '"userId"'
        : null;
    const uoOrgCol = uoColSet.has('organization_id')
      ? 'organization_id'
      : uoColSet.has('organizationId')
        ? '"organizationId"'
        : null;
    if (!uoUserCol || !uoOrgCol) {
      console.error(
        'ERROR: user_organizations must have user_id or userId (and org id column).',
      );
      process.exit(1);
    }

    const adminRow = await client.query(
      `SELECT ${uoUserCol} AS uid FROM user_organizations
       WHERE ${uoOrgCol} = $1
         AND role IN ('owner', 'admin')
         AND "isActive" = true
       LIMIT 1`,
      [orgId],
    );
    if (adminRow.rows.length === 0) {
      console.error(
        'ERROR: No active owner/admin in this org — cannot attach workspace membership.',
      );
      process.exit(1);
    }
    const adminUserId: string = adminRow.rows[0].uid;

    let ws = await client.query(
      `SELECT id, name, slug FROM workspaces
       WHERE organization_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC
       LIMIT 1`,
      [orgId],
    );

    let workspaceId: string;
    let workspaceSlug: string;
    if (ws.rows.length === 0) {
      const slug = orgSlug || 'main';
      const ins = await client.query(
        `INSERT INTO workspaces (
           id, organization_id, name, slug, is_private,
           created_by, owner_id, created_at, updated_at
         )
         VALUES (
           gen_random_uuid(), $1, $2, $3, false,
           $4, $4, NOW(), NOW()
         )
         RETURNING id, slug`,
        [orgId, 'Default', slug, adminUserId],
      );
      workspaceId = ins.rows[0].id;
      workspaceSlug = ins.rows[0].slug;
      console.log(`Created workspace "Default" (${workspaceId}, slug=${workspaceSlug})`);
    } else {
      workspaceId = ws.rows[0].id;
      workspaceSlug = ws.rows[0].slug;
      console.log(
        `Using workspace "${ws.rows[0].name}" (${workspaceId}, slug=${workspaceSlug})`,
      );
    }

    const hashedPassword = await bcrypt.hash(MEMBER_PASSWORD, 10);

    let userResult = await client.query('SELECT id FROM users WHERE email = $1', [
      MEMBER_EMAIL,
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
          MEMBER_EMAIL,
          'Acme',
          'Test Member',
          hashedPassword,
          'MEMBER',
          orgId,
        ],
      );
      userId = userInsert.rows[0].id;
      console.log(`User created: ${MEMBER_EMAIL}`);
    } else {
      userId = userResult.rows[0].id;
      await client.query(
        `UPDATE users
         SET organization_id = $1,
             role = $2,
             password = $3,
             is_email_verified = true,
             email_verified_at = COALESCE(email_verified_at, NOW()),
             onboarding_completed = true,
             is_active = true,
             updated_at = NOW()
         WHERE id = $4`,
        [orgId, 'MEMBER', hashedPassword, userId],
      );
      console.log(`User updated: ${MEMBER_EMAIL}`);
    }

    const uo = await client.query(
      `SELECT id FROM user_organizations WHERE ${uoUserCol} = $1 AND ${uoOrgCol} = $2`,
      [userId, orgId],
    );

    if (uo.rows.length === 0) {
      if (uoColSet.has('user_id') && uoColSet.has('organization_id')) {
        await client.query(
          `INSERT INTO user_organizations (
             id, user_id, organization_id, role, "isActive", permissions, "createdAt", "updatedAt"
           )
           VALUES (gen_random_uuid(), $1, $2, $3, true, '{}', NOW(), NOW())`,
          [userId, orgId, 'pm'],
        );
      } else if (uoColSet.has('userId') && uoColSet.has('organizationId')) {
        await client.query(
          `INSERT INTO user_organizations (
             id, "userId", "organizationId", role, "isActive", permissions, "joinedAt", "createdAt", "updatedAt"
           )
           VALUES (gen_random_uuid(), $1, $2, $3, true, '{}', NOW(), NOW(), NOW())`,
          [userId, orgId, 'pm'],
        );
      } else {
        console.error(
          'ERROR: user_organizations needs either (user_id, organization_id) or (userId, organizationId).',
        );
        process.exit(1);
      }
      console.log(`user_organizations: ${MEMBER_EMAIL} -> pm (platform MEMBER)`);
    } else {
      await client.query(
        `UPDATE user_organizations
         SET role = $1, "isActive" = true, "updatedAt" = NOW()
         WHERE ${uoUserCol} = $2 AND ${uoOrgCol} = $3`,
        ['pm', userId, orgId],
      );
      console.log(`user_organizations updated: ${MEMBER_EMAIL} -> pm`);
    }

    const wmCols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'workspace_members'`,
    );
    const colSet = new Set(
      wmCols.rows.map((r: { column_name: string }) => r.column_name),
    );

    const existing = await client.query(
      `SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId],
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE workspace_members SET role = $1, updated_at = NOW() WHERE id = $2`,
        ['workspace_member', existing.rows[0].id],
      );
    } else if (colSet.has('organization_id')) {
      await client.query(
        `INSERT INTO workspace_members (
           id, workspace_id, user_id, organization_id, role, created_by, status, created_at, updated_at
         )
         VALUES (
           gen_random_uuid(), $1, $2, $3, $4, $5, 'active', NOW(), NOW()
         )`,
        [workspaceId, userId, orgId, 'workspace_member', adminUserId],
      );
    } else {
      await client.query(
        `INSERT INTO workspace_members (
           id, workspace_id, user_id, role, created_by, status, created_at, updated_at
         )
         VALUES (
           gen_random_uuid(), $1, $2, $3, $4, 'active', NOW(), NOW()
         )`,
        [workspaceId, userId, 'workspace_member', adminUserId],
      );
    }
    console.log('Workspace membership: workspace_member on first workspace.');

    console.log('\n--- Test member credentials ---');
    console.log(`Email:    ${MEMBER_EMAIL}`);
    console.log(`Password: ${MEMBER_PASSWORD}`);
    console.log(`Org:      ${ORG_NAME}`);
    console.log(`Workspace slug (first): ${workspaceSlug}`);
    console.log(
      '\nSign in on staging frontend. Landing: /home if onboarding complete (script sets true), else /onboarding.',
    );
    console.log(
      'MEMBER can access paid routes (not VIEWER/Guest); workspace tree only where member.',
    );
  } catch (e) {
    console.error('Setup failed:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

void main();
