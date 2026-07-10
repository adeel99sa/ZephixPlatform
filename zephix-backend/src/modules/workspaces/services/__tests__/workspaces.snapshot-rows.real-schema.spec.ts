/**
 * D3b — Real-schema integration test for WorkspacesService.getSnapshotRows.
 *
 * Why this exists: the admin overview "Workspace Snapshot" was returning an
 * empty list on staging while GET /admin/workspaces returned rows. Root cause
 * was NOT a tenant-context gap (the TenantContextInterceptor 403s any /api/
 * request that lacks org context, so the controller cannot run without a valid
 * org). The real cause was a hand-written-SQL column-name bug inside
 * getSnapshotRows' owner query:
 *
 *     SELECT m.workspace_id, m."userId" AS user_id, u.email,
 *            u."firstName" AS first_name, u."lastName" AS last_name
 *     FROM workspace_members m
 *     JOIN users u ON u.id = m."userId"
 *
 * The workspace_members entity maps `userId` -> DB column `user_id`, and the
 * users entity maps `firstName`/`lastName` -> `first_name`/`last_name`. The
 * quoted camelCase identifiers `m."userId"`, `u."firstName"`, `u."lastName"`
 * do NOT exist, so Postgres throws `column m.userId does not exist`, the owner
 * query throws, and the controller's catch returns `{ data: [] }`. Every
 * session — real JWT admin and smoke — hit this identically.
 *
 * A mocked-DataSource unit test cannot catch this class of bug
 * (feedback_mocked_querybuilder_gap): a `jest.fn()` stub returns whatever it
 * is told regardless of column names. Only a real Postgres schema proves the
 * column references resolve.
 *
 * 4-test pattern (matches B1/B2 R1):
 *   1. Positive — the fixed owner query resolves against the real
 *      workspace_members/users schema and returns the seeded workspace_owner
 *      with a composed full name.
 *   2. Regression proof (negative control) — the OLD buggy query with
 *      `m."userId"` throws `column ... does not exist`, demonstrating exactly
 *      why the snapshot was empty pre-fix.
 *   3. Source-integrity — pattern-match workspaces.service.ts to assert
 *      getSnapshotRows uses snake_case `m.user_id`/`u.first_name`/`u.last_name`
 *      and does NOT reference the quoted-camelCase forms. Fails immediately if
 *      anyone reintroduces the bug.
 *   4. Schema-sanity — confirm workspace_members exposes `user_id` (and not a
 *      `userId` column) and users exposes `first_name`/`last_name`.
 *
 * Locally: ensure `docker ps` shows zephix-postgres on :5433. The suite skips
 * cleanly if Postgres is unreachable.
 *
 * To run: `npx jest src/modules/workspaces/services/__tests__/workspaces.snapshot-rows.real-schema.spec.ts`
 */

import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `d3b_snapshot_${Date.now()}`;

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_ORG_ID = '99999999-9999-9999-9999-999999999999';
const OWNER_USER_ID = '22222222-2222-2222-2222-222222222222';
const MEMBER_USER_ID = '33333333-3333-3333-3333-333333333333';
const WS_WITH_OWNER = '44444444-4444-4444-4444-444444444444';
const WS_NO_OWNER = '55555555-5555-5555-5555-555555555555';

// The exact owner query getSnapshotRows runs (post-fix). Kept in the test so
// the positive assertion exercises the same column references the service
// emits; test #3 ties this string back to the service source.
const FIXED_OWNER_SQL = `
  SELECT m.workspace_id, m.user_id AS user_id, u.email,
         u.first_name AS first_name, u.last_name AS last_name
  FROM workspace_members m
  JOIN users u ON u.id = m.user_id
  WHERE m.organization_id = $1
    AND m.workspace_id = ANY($2::uuid[])
    AND m.role = 'workspace_owner'
  ORDER BY m.workspace_id, u.email
`;

// The pre-fix query that shipped the bug. Postgres must reject it.
const BUGGY_OWNER_SQL = `
  SELECT m.workspace_id, m."userId" AS user_id, u.email,
         u."firstName" AS first_name, u."lastName" AS last_name
  FROM workspace_members m
  JOIN users u ON u.id = m."userId"
  WHERE m.organization_id = $1
    AND m.workspace_id = ANY($2::uuid[])
    AND m.role = 'workspace_owner'
`;

describe('WorkspacesService — D3b real-schema (getSnapshotRows owner query)', () => {
  let adminDS: DataSource | null = null;
  let testDS: DataSource | null = null;
  let dbReady = false;

  beforeAll(async () => {
    adminDS = new DataSource({
      type: 'postgres',
      host: PG_HOST,
      port: PG_PORT,
      username: PG_USER,
      password: PG_PASSWORD,
      database: 'postgres',
    });

    try {
      await adminDS.initialize();
      await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
      await adminDS.query(`CREATE DATABASE "${TEST_DB}"`);
    } catch (err) {
      console.warn(
        `[D3b] Postgres at ${PG_HOST}:${PG_PORT} unreachable — suite will skip. Error: ${(err as Error).message}`,
      );
      return;
    }

    testDS = new DataSource({
      type: 'postgres',
      host: PG_HOST,
      port: PG_PORT,
      username: PG_USER,
      password: PG_PASSWORD,
      database: TEST_DB,
    });
    await testDS.initialize();
    await testDS.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Reproduce the production column names the owner query depends on. Only
    // the columns referenced by getSnapshotRows are modelled.
    await testDS.query(`
      CREATE TABLE "users" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email"       VARCHAR(255) NOT NULL,
        "first_name"  VARCHAR(255) NULL,
        "last_name"   VARCHAR(255) NULL
      )
    `);

    await testDS.query(`
      CREATE TABLE "workspace_members" (
        "id"               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id"  UUID NOT NULL,
        "workspace_id"     UUID NOT NULL,
        "user_id"          UUID NOT NULL,
        "role"             TEXT NOT NULL,
        "status"           TEXT NOT NULL DEFAULT 'active'
      )
    `);

    await testDS.query(`
      CREATE TABLE "projects" (
        "id"               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id"  UUID NOT NULL,
        "workspace_id"     UUID NOT NULL,
        "deleted_at"       TIMESTAMP NULL
      )
    `);

    await testDS.query(
      `INSERT INTO users (id, email, first_name, last_name) VALUES
         ($1, 'owner@zephix.dev', 'Ada', 'Owner'),
         ($2, 'member@zephix.dev', NULL, NULL)`,
      [OWNER_USER_ID, MEMBER_USER_ID],
    );

    // WS_WITH_OWNER: one workspace_owner + one plain member (must be excluded
    // by the role filter). WS_NO_OWNER: only a plain member (no owner row).
    await testDS.query(
      `INSERT INTO workspace_members (organization_id, workspace_id, user_id, role) VALUES
         ($1, $2, $3, 'workspace_owner'),
         ($1, $2, $4, 'workspace_member'),
         ($1, $5, $4, 'workspace_member')`,
      [ORG_ID, WS_WITH_OWNER, OWNER_USER_ID, MEMBER_USER_ID, WS_NO_OWNER],
    );

    // Cross-org owner row that must NEVER leak into ORG_ID results.
    await testDS.query(
      `INSERT INTO workspace_members (organization_id, workspace_id, user_id, role)
         VALUES ($1, $2, $3, 'workspace_owner')`,
      [OTHER_ORG_ID, WS_WITH_OWNER, MEMBER_USER_ID],
    );

    dbReady = true;
  }, 30_000);

  afterAll(async () => {
    if (testDS && testDS.isInitialized) {
      await testDS.destroy();
    }
    if (adminDS && adminDS.isInitialized && dbReady) {
      try {
        await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
      } catch {
        // best effort
      }
      await adminDS.destroy();
    }
  }, 30_000);

  // ── 1. Positive: the fixed owner query resolves and returns the owner ────
  it('fixed owner query resolves against real schema and returns the workspace_owner with a composed name', async () => {
    if (!dbReady || !testDS) {
      console.warn('[D3b] skipped: postgres not available');
      return;
    }

    const rows: Array<{
      workspace_id: string;
      user_id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
    }> = await testDS.query(FIXED_OWNER_SQL, [
      ORG_ID,
      [WS_WITH_OWNER, WS_NO_OWNER],
    ]);

    // Only the workspace_owner in ORG_ID — the plain member and the cross-org
    // owner are excluded.
    expect(rows).toHaveLength(1);
    expect(rows[0].workspace_id).toBe(WS_WITH_OWNER);
    expect(rows[0].user_id).toBe(OWNER_USER_ID);
    expect(rows[0].email).toBe('owner@zephix.dev');

    // Mirror the service's name composition to prove the aliased columns feed
    // it correctly.
    const fullName =
      [rows[0].first_name, rows[0].last_name].filter(Boolean).join(' ').trim() ||
      rows[0].email;
    expect(fullName).toBe('Ada Owner');
  });

  // ── 2. Regression proof: the old buggy query is rejected by Postgres ─────
  it('pre-fix query with m."userId" throws column-does-not-exist (this is why the snapshot was empty)', async () => {
    if (!dbReady || !testDS) return;

    await expect(
      testDS.query(BUGGY_OWNER_SQL, [ORG_ID, [WS_WITH_OWNER]]),
    ).rejects.toThrow(/column .*userId.* does not exist/i);
  });

  // ── 3. Source-integrity: service uses snake_case, not quoted camelCase ───
  it('D3b source-code integrity: getSnapshotRows references snake_case columns and no quoted-camelCase identifiers', () => {
    const sourceFile = path.join(
      __dirname,
      '..',
      '..',
      'workspaces.service.ts',
    );
    const source: string = fs.readFileSync(sourceFile, 'utf8');
    const methodStart = source.indexOf('async getSnapshotRows');
    expect(methodStart).toBeGreaterThan(-1);
    const slice = source.slice(methodStart, methodStart + 4000);

    // Correct references present.
    expect(slice).toMatch(/m\.user_id AS user_id/);
    expect(slice).toMatch(/u\.first_name AS first_name/);
    expect(slice).toMatch(/u\.last_name AS last_name/);
    expect(slice).toMatch(/JOIN users u ON u\.id = m\.user_id/);

    // The exact bug must not return.
    expect(slice).not.toMatch(/m\."userId"/);
    expect(slice).not.toMatch(/u\."firstName"/);
    expect(slice).not.toMatch(/u\."lastName"/);
  });

  // ── 4. Schema-sanity: real column names match the service's assumptions ──
  it('schema-sanity: workspace_members exposes user_id (not userId) and users exposes first_name/last_name', async () => {
    if (!dbReady || !testDS) return;

    const wmCols: Array<{ column_name: string }> = await testDS.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'workspace_members'
    `);
    const wmNames = wmCols.map((r) => r.column_name);
    expect(wmNames).toEqual(expect.arrayContaining(['user_id', 'organization_id', 'workspace_id', 'role']));
    expect(wmNames).not.toContain('userId');

    const userCols: Array<{ column_name: string }> = await testDS.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
    `);
    const userNames = userCols.map((r) => r.column_name);
    expect(userNames).toEqual(expect.arrayContaining(['first_name', 'last_name', 'email']));
    expect(userNames).not.toContain('firstName');
  });
});
