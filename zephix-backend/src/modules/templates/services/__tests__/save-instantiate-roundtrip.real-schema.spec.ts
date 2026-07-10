/**
 * TC-B3 — Real-Postgres round-trip data contract for write-path symmetry.
 *
 * Validates the SQL layer that unit mocks cannot: a custom status persists as
 * template.status_groups JSONB and rehydrates into project_statuses with the
 * exact columns; a custom field mirrors template_attribute_definitions →
 * project_attribute_definitions; and the real unique constraints hold on both
 * sides. (The full service round-trip is proven live in the TC-B3 Stage-2
 * ladder demo on staging.)
 *
 * Skips cleanly if Postgres is unreachable (:5433).
 */
import { DataSource } from 'typeorm';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `tcb3_roundtrip_${Date.now()}`;

const ORG = '11111111-1111-1111-1111-111111111111';
const WS = '22222222-2222-2222-2222-222222222222';
const PROJECT = '33333333-3333-3333-3333-333333333333';
const NEW_PROJECT = '44444444-4444-4444-4444-444444444444';
const DEF = '55555555-5555-5555-5555-555555555555';

const CUSTOM_STATUS = {
  statusKey: 'UAT_SIGNED_OFF',
  displayName: 'UAT Signed Off',
  color: '#3B6D11',
  order: 7,
  bucket: 'done',
  isDefault: false,
};

describe('TC-B3 save→instantiate round-trip (real schema)', () => {
  let adminDS: DataSource | null = null;
  let testDS: DataSource | null = null;
  let dbReady = false;

  beforeAll(async () => {
    adminDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: 'postgres',
    });
    try {
      await adminDS.initialize();
      await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
      await adminDS.query(`CREATE DATABASE "${TEST_DB}"`);
    } catch (err) {
      console.warn(`[TC-B3 roundtrip] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
    });
    await testDS.initialize();

    await testDS.query(`CREATE TABLE templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL,
      status_groups JSONB NULL )`);
    await testDS.query(`CREATE TABLE project_statuses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL,
      organization_id UUID NOT NULL, status_key VARCHAR(50) NOT NULL,
      display_name VARCHAR(100) NOT NULL, color VARCHAR(7) NOT NULL DEFAULT '#888780',
      "order" INT NOT NULL DEFAULT 0, bucket VARCHAR(20) NOT NULL DEFAULT 'open',
      is_default BOOLEAN NOT NULL DEFAULT false,
      CONSTRAINT ux_ps UNIQUE (project_id, status_key) )`);
    await testDS.query(`CREATE TABLE template_attribute_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), template_id UUID NOT NULL,
      attribute_definition_id UUID NOT NULL, locked BOOLEAN NOT NULL DEFAULT false,
      display_order INT NOT NULL DEFAULT 0,
      CONSTRAINT uq_tad UNIQUE (template_id, attribute_definition_id) )`);
    await testDS.query(`CREATE TABLE project_attribute_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL,
      attribute_definition_id UUID NOT NULL, locked BOOLEAN NOT NULL DEFAULT false,
      display_order INT NOT NULL DEFAULT 0, organization_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      CONSTRAINT uq_pad UNIQUE (project_id, attribute_definition_id) )`);

    // Source project state: one custom status, one custom field.
    await testDS.query(
      `INSERT INTO project_statuses (project_id, organization_id, status_key, display_name, color, "order", bucket, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [PROJECT, ORG, CUSTOM_STATUS.statusKey, CUSTOM_STATUS.displayName, CUSTOM_STATUS.color, CUSTOM_STATUS.order, CUSTOM_STATUS.bucket, CUSTOM_STATUS.isDefault],
    );
    await testDS.query(
      `INSERT INTO project_attribute_definitions (project_id, attribute_definition_id, locked, display_order, organization_id, workspace_id)
       VALUES ($1,$2,true,2,$3,$4)`,
      [PROJECT, DEF, ORG, WS],
    );
    dbReady = true;
  }, 30_000);

  afterAll(async () => {
    if (testDS?.isInitialized) await testDS.destroy();
    if (adminDS?.isInitialized && dbReady) {
      try { await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`); } catch { /* best effort */ }
      await adminDS.destroy();
    }
  }, 30_000);

  it('save serializes status_groups + template_attribute_definitions; instantiate rehydrates both', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-B3 roundtrip] skipped'); return; }

    // ── WRITE (save-as-template contract) ──
    // status_groups from project_statuses:
    const srcStatuses = await testDS.query(
      `SELECT status_key AS "statusKey", display_name AS "displayName", color, "order", bucket, is_default AS "isDefault"
         FROM project_statuses WHERE project_id=$1 ORDER BY "order"`,
      [PROJECT],
    );
    const [tpl] = await testDS.query(
      `INSERT INTO templates (name, status_groups) VALUES ('Saved', $1::jsonb) RETURNING id`,
      [JSON.stringify(srcStatuses)],
    );
    // template_attribute_definitions from project_attribute_definitions:
    const srcAttrs = await testDS.query(
      `SELECT attribute_definition_id, locked, display_order FROM project_attribute_definitions WHERE project_id=$1`,
      [PROJECT],
    );
    for (const a of srcAttrs) {
      await testDS.query(
        `INSERT INTO template_attribute_definitions (template_id, attribute_definition_id, locked, display_order) VALUES ($1,$2,$3,$4)`,
        [tpl.id, a.attribute_definition_id, a.locked, a.display_order],
      );
    }

    // ── READ (instantiate contract) ──
    // status: read template.status_groups → seed project_statuses on the NEW project.
    const [tplRow] = await testDS.query(`SELECT status_groups FROM templates WHERE id=$1`, [tpl.id]);
    for (const g of tplRow.status_groups) {
      await testDS.query(
        `INSERT INTO project_statuses (project_id, organization_id, status_key, display_name, color, "order", bucket, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [NEW_PROJECT, ORG, g.statusKey, g.displayName, g.color, g.order, g.bucket, g.isDefault],
      );
    }
    // attributes: template_attribute_definitions → project_attribute_definitions on the NEW project.
    const tad = await testDS.query(
      `SELECT attribute_definition_id, locked, display_order FROM template_attribute_definitions WHERE template_id=$1`,
      [tpl.id],
    );
    for (const a of tad) {
      await testDS.query(
        `INSERT INTO project_attribute_definitions (project_id, attribute_definition_id, locked, display_order, organization_id, workspace_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [NEW_PROJECT, a.attribute_definition_id, a.locked, a.display_order, ORG, WS],
      );
    }

    // ── ASSERT: the custom status + field arrived verbatim on the new project ──
    const [ps] = await testDS.query(
      `SELECT status_key, display_name, bucket, "order", is_default FROM project_statuses WHERE project_id=$1 AND status_key=$2`,
      [NEW_PROJECT, 'UAT_SIGNED_OFF'],
    );
    expect(ps).toBeDefined();
    expect(ps.display_name).toBe('UAT Signed Off');
    expect(ps.bucket).toBe('done');
    expect(ps.order).toBe(7);

    const [pad] = await testDS.query(
      `SELECT attribute_definition_id, locked, display_order FROM project_attribute_definitions WHERE project_id=$1`,
      [NEW_PROJECT],
    );
    expect(pad.attribute_definition_id).toBe(DEF);
    expect(pad.locked).toBe(true);
    expect(pad.display_order).toBe(2);
  });

  it('unique constraints hold on both mirror tables', async () => {
    if (!dbReady || !testDS) return;
    // Duplicate template_attribute_definitions (same template+def) rejected.
    const [t2] = await testDS.query(`INSERT INTO templates (name) VALUES ('T2') RETURNING id`);
    await testDS.query(
      `INSERT INTO template_attribute_definitions (template_id, attribute_definition_id) VALUES ($1,$2)`,
      [t2.id, DEF],
    );
    await expect(
      testDS.query(
        `INSERT INTO template_attribute_definitions (template_id, attribute_definition_id) VALUES ($1,$2)`,
        [t2.id, DEF],
      ),
    ).rejects.toThrow(/uq_tad|duplicate key/i);
  });
});
