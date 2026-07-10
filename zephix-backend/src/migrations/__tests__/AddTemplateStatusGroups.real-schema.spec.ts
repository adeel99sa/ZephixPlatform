/**
 * TC-B3 — Real-schema up/down test for migration 18000000000205 (status_groups).
 * Skips cleanly if Postgres is unreachable (:5433).
 */
import { DataSource } from 'typeorm';
import { AddTemplateStatusGroups18000000000205 } from '../18000000000205-AddTemplateStatusGroups';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `tcb3_migration_${Date.now()}`;

describe('Migration 205 — AddTemplateStatusGroups (real-schema up/down)', () => {
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
      console.warn(`[TC-B3 migration] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
    });
    await testDS.initialize();
    await testDS.query(
      `CREATE TABLE "templates" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "name" VARCHAR(100) NOT NULL)`,
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

  const col = async () =>
    (await testDS!.query(
      `SELECT data_type, is_nullable FROM information_schema.columns WHERE table_name='templates' AND column_name='status_groups'`,
    ))[0];

  it('up(): adds a nullable jsonb status_groups column that round-trips JSON', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-B3 migration] skipped'); return; }
    const qr = testDS.createQueryRunner();
    await qr.connect();
    await new AddTemplateStatusGroups18000000000205().up(qr);
    await qr.release();

    const c = await col();
    expect(c.data_type).toBe('jsonb');
    expect(c.is_nullable).toBe('YES');

    const groups = [{ statusKey: 'UAT_SIGNED_OFF', bucket: 'done', order: 7 }];
    const [row] = await testDS.query(
      `INSERT INTO templates (name, status_groups) VALUES ('t', $1::jsonb) RETURNING status_groups`,
      [JSON.stringify(groups)],
    );
    expect(row.status_groups).toEqual(groups);
    // NULL allowed for SYSTEM templates.
    await expect(
      testDS.query(`INSERT INTO templates (name, status_groups) VALUES ('sys', NULL)`),
    ).resolves.toBeDefined();
  });

  it('down(): drops the column', async () => {
    if (!dbReady || !testDS) return;
    const qr = testDS.createQueryRunner();
    await qr.connect();
    await new AddTemplateStatusGroups18000000000205().down(qr);
    await qr.release();
    expect(await col()).toBeUndefined();
  });
});
