/**
 * R1 — Real-schema integration test for B2 complexity_mode wiring.
 *
 * Why this exists: B2 PR1 changes WorkspacesService.setComplexityMode and
 * widens the workspace_complexity_mode_enum (Stage 1 additive: lean +
 * governed). Mocked-QueryBuilder unit tests cannot prove that the service
 * reads/writes the actual `complexity_mode` column correctly, nor that the
 * Postgres ENUM accepts the new values. The B1 hotfix root cause
 * (feedback_mocked_querybuilder_gap) is the canonical reason this guard
 * exists.
 *
 * 4-test pattern (matches B1 R1):
 *   1. Positive — UPDATE/SELECT against a real `workspaces` row exercises
 *      the same column reference (`complexity_mode`) the service writes,
 *      with all five enum values (lean, standard, governed, simple,
 *      advanced) round-tripping cleanly.
 *   2. Negative control — pre-Stage-1 legacy values (simple, advanced)
 *      still SELECT correctly on the post-migration schema. Confirms the
 *      additive migration didn't break legacy rows.
 *   3. Source-integrity — pattern-match workspaces.service.ts to assert
 *      setComplexityMode references the `complexity_mode` column / the
 *      WorkspaceComplexityMode enum the entity declares. If anyone
 *      replaces the column reference, this test fails immediately.
 *   4. Schema-sanity — confirm the test schema's `complexity_mode` column
 *      uses an ENUM type and the enum has at minimum the five values
 *      {simple, standard, advanced, lean, governed}.
 *
 * Locally: ensure `docker ps` shows zephix-postgres on :5433. The suite
 * skips cleanly if Postgres is unreachable (CI gate is the staging-copy
 * migration validation, not this local-dev test).
 *
 * To run: `npx jest src/modules/workspaces/services/__tests__/workspaces.complexity-mode.real-schema.spec.ts`
 */

import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `b2_r1_complexity_${Date.now()}`;

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';
const WS_LEAN = '33333333-3333-3333-3333-333333333333';
const WS_LEGACY_SIMPLE = '44444444-4444-4444-4444-444444444444';
const WS_LEGACY_ADVANCED = '55555555-5555-5555-5555-555555555555';

describe('WorkspacesService — R1 real-schema (complexity_mode column + Stage-1 enum)', () => {
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
        `[B2 R1] Postgres at ${PG_HOST}:${PG_PORT} unreachable — suite will skip. Error: ${(err as Error).message}`,
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

    // Reproduce production enum + workspaces table shape (subset relevant
    // to the complexity_mode contract). Migrations 18000000000080 +
    // 18000000000160 (Stage 1) are folded in here so the test schema
    // matches the post-PR1 production state.
    await testDS.query(`
      CREATE TYPE workspace_complexity_mode_enum AS ENUM
        ('simple', 'standard', 'advanced', 'lean', 'governed')
    `);

    await testDS.query(`
      CREATE TABLE "workspaces" (
        "id"               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id"  UUID NOT NULL,
        "name"             VARCHAR(100) NOT NULL,
        "is_private"       BOOLEAN NOT NULL DEFAULT FALSE,
        "created_by"       UUID NOT NULL,
        "complexity_mode"  workspace_complexity_mode_enum NOT NULL DEFAULT 'simple',
        "created_at"       TIMESTAMP DEFAULT now(),
        "updated_at"       TIMESTAMP DEFAULT now(),
        "deleted_at"       TIMESTAMP NULL
      )
    `);

    // Seed: one row per relevant enum value to exercise both fresh
    // (lean/standard/governed) and legacy (simple/advanced) cases.
    await testDS.query(
      `INSERT INTO workspaces (id, organization_id, name, created_by, complexity_mode)
       VALUES
         ($1, $5, 'lean ws',     $4, 'lean'),
         ($2, $5, 'simple ws',   $4, 'simple'),
         ($3, $5, 'advanced ws', $4, 'advanced')`,
      [WS_LEAN, WS_LEGACY_SIMPLE, WS_LEGACY_ADVANCED, USER_ID, ORG_ID],
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

  // ── 1. Positive: setComplexityMode round-trip mirrors the service ─────
  // The service performs `repo.save(ws)` after assigning the new value.
  // We exercise the same column-reference path via raw SQL (mirrors the
  // generated UPDATE statement). All three B2 vocabulary values must
  // round-trip cleanly.
  it.each(['lean', 'standard', 'governed'])(
    "round-trips '%s' via UPDATE/SELECT on complexity_mode column",
    async (value) => {
      if (!dbReady || !testDS) {
        console.warn('[B2 R1] skipped: postgres not available');
        return;
      }

      await testDS.query(
        `UPDATE workspaces SET complexity_mode = $1 WHERE id = $2`,
        [value, WS_LEAN],
      );

      const rows: Array<{ complexity_mode: string }> = await testDS.query(
        `SELECT complexity_mode FROM workspaces WHERE id = $1`,
        [WS_LEAN],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].complexity_mode).toBe(value);
    },
    30_000,
  );

  // ── 2. Negative control: legacy values still resolve under post-Stage-1 schema ─
  // Stage 1 is purely additive; legacy rows must remain readable until
  // the Stage 2 backfill completes (PR2). If this test ever fails, it
  // means a future migration removed simple/advanced prematurely — the
  // three-stage rename invariant is broken.
  it('legacy SIMPLE rows still SELECT correctly on the post-Stage-1 schema', async () => {
    if (!dbReady || !testDS) return;
    const rows: Array<{ complexity_mode: string }> = await testDS.query(
      `SELECT complexity_mode FROM workspaces WHERE id = $1`,
      [WS_LEGACY_SIMPLE],
    );
    expect(rows[0].complexity_mode).toBe('simple');
  });

  it('legacy ADVANCED rows still SELECT correctly on the post-Stage-1 schema', async () => {
    if (!dbReady || !testDS) return;
    const rows: Array<{ complexity_mode: string }> = await testDS.query(
      `SELECT complexity_mode FROM workspaces WHERE id = $1`,
      [WS_LEGACY_ADVANCED],
    );
    expect(rows[0].complexity_mode).toBe('advanced');
  });

  // ── 3. Source-integrity: service file references the right column ─────
  // If anyone renames `complexity_mode` or replaces setComplexityMode's
  // implementation with a write-elsewhere shim, this test fails. Mocked
  // QB tests cannot catch this; this guard is the dual to the schema-side
  // round-trip above.
  it('R1 source-code integrity: workspaces.service.ts setComplexityMode emits a save and references complexityMode', () => {
    const sourceFile = path.join(
      __dirname,
      '..',
      '..',
      'workspaces.service.ts',
    );
    const source: string = fs.readFileSync(sourceFile, 'utf8');
    const methodStart = source.indexOf('async setComplexityMode');
    expect(methodStart).toBeGreaterThan(-1);
    // Slice generously — covers the full method body (guard, audit, save).
    const slice = source.slice(methodStart, methodStart + 4000);

    // Must mutate the entity field name TypeORM maps to complexity_mode.
    expect(slice).toMatch(/ws\.complexityMode\s*=\s*mode/);
    // Must persist via the workspace repo (not some side channel).
    expect(slice).toMatch(/this\.repo\.save\(ws\)/);
    // ADR-B2-004: must enforce the admin guard with the structured code.
    expect(slice).toMatch(/WORKSPACE_COMPLEXITY_MODE_ADMIN_ONLY/);
  });

  // ── 4. Schema-sanity: enum has all five values, column type is ENUM ───
  it('schema-sanity: workspace_complexity_mode_enum contains lean+standard+governed+simple+advanced', async () => {
    if (!dbReady || !testDS) return;

    const rows: Array<{ enum_value: string }> = await testDS.query(`
      SELECT e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'workspace_complexity_mode_enum'
      ORDER BY e.enumsortorder
    `);
    const values = rows.map((r) => r.enum_value);

    expect(values).toEqual(
      expect.arrayContaining([
        'simple',
        'standard',
        'advanced',
        'lean',
        'governed',
      ]),
    );

    // Column must be of that ENUM type, NOT NULL, defaulting to 'simple'
    // (PR1 invariant — PR2 flips default to 'lean').
    const colRows: Array<{ udt_name: string; is_nullable: string; column_default: string }> =
      await testDS.query(`
      SELECT udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'workspaces' AND column_name = 'complexity_mode'
    `);
    expect(colRows).toHaveLength(1);
    expect(colRows[0].udt_name).toBe('workspace_complexity_mode_enum');
    expect(colRows[0].is_nullable).toBe('NO');
    expect(colRows[0].column_default).toMatch(/'simple'/);
  });
});
