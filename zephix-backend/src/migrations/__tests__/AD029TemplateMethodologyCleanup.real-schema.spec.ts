/**
 * TC-B2 — Real-schema up/down test for migration 18000000000204 (AD-029 cleanup).
 *
 * Runs the ACTUAL migration class against a real Postgres schema: proves the
 * agile→scrum backfill, the duplicate-Waterfall archive, the debris archive,
 * and the additive NULL-tolerant methodology CHECK; down() drops the CHECK and
 * leaves data forward-only. Skips cleanly if Postgres is unreachable (:5433).
 */
import { DataSource } from 'typeorm';
import { AD029TemplateMethodologyCleanup18000000000204 } from '../18000000000204-AD029TemplateMethodologyCleanup';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `tcb2_migration_${Date.now()}`;

const DUP = '3dc439f5-12e2-46bf-b517-f28d9973bebe';
const DEBRIS_A = '3a277af8-322b-48b2-941b-b6c4e75e81b4'; // Wave4 null/null
const DEBRIS_B = '3d32da56-d049-44cb-8e4b-d00fc501f76c'; // TC-B1 artifact agile/null
const SURVIVOR = 'e1add877-400a-4452-b388-80926bc15919';
const AGILE_SCRUM = 'aaaaaaaa-0000-0000-0000-000000000001';
const HYBRID = 'bbbbbbbb-0000-0000-0000-000000000002';

describe('Migration 204 — AD-029 cleanup (real-schema up/down)', () => {
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
      console.warn(`[TC-B2 migration] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
    });
    await testDS.initialize();
    await testDS.query(`
      CREATE TABLE "templates" (
        "id"             UUID PRIMARY KEY,
        "name"           VARCHAR(100) NOT NULL,
        "methodology"    VARCHAR(50) NULL,
        "delivery_method" TEXT NULL,
        "is_active"      BOOLEAN NOT NULL DEFAULT TRUE,
        "is_published"   BOOLEAN NOT NULL DEFAULT TRUE,
        "archived_at"    TIMESTAMP NULL
      )
    `);
    await testDS.query(
      `INSERT INTO templates (id, name, methodology, delivery_method, is_active, is_published, archived_at) VALUES
         ($1,'dup waterfall','waterfall','WATERFALL',false,true,NULL),
         ($2,'wave4 debris',NULL,NULL,true,true,NULL),
         ($3,'tcb1 artifact','agile',NULL,true,true,NULL),
         ($4,'survivor waterfall','waterfall','WATERFALL',true,true,NULL),
         ($5,'agile scrum','agile','SCRUM',true,true,NULL),
         ($6,'hybrid','hybrid','HYBRID',true,true,NULL)`,
      [DUP, DEBRIS_A, DEBRIS_B, SURVIVOR, AGILE_SCRUM, HYBRID],
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

  const one = async (id: string) =>
    (await testDS!.query(`SELECT * FROM templates WHERE id=$1`, [id]))[0];

  it('up(): backfills agile→scrum, archives duplicate + debris, adds NULL-tolerant CHECK', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-B2 migration] skipped'); return; }
    const qr = testDS.createQueryRunner();
    await qr.connect();
    await new AD029TemplateMethodologyCleanup18000000000204().up(qr);
    await qr.release();

    // No 'agile' remains.
    const agile = await testDS.query(`SELECT count(*)::int c FROM templates WHERE methodology='agile'`);
    expect(agile[0].c).toBe(0);
    // agile rows became scrum.
    expect((await one(AGILE_SCRUM)).methodology).toBe('scrum');
    expect((await one(DEBRIS_B)).methodology).toBe('scrum');

    // Duplicate archived (archived_at set, is_active=false, is_published=false).
    const dup = await one(DUP);
    expect(dup.archived_at).not.toBeNull();
    expect(dup.is_active).toBe(false);
    expect(dup.is_published).toBe(false);

    // Debris archived.
    for (const id of [DEBRIS_A, DEBRIS_B]) {
      const r = await one(id);
      expect(r.archived_at).not.toBeNull();
      expect(r.is_active).toBe(false);
      expect(r.is_published).toBe(false);
    }

    // Survivor untouched.
    const surv = await one(SURVIVOR);
    expect(surv.archived_at).toBeNull();
    expect(surv.is_active).toBe(true);

    // CHECK present: NULL allowed, 'agile' rejected, canonical accepted.
    await expect(
      testDS.query(`INSERT INTO templates (id,name,methodology) VALUES (gen_random_uuid(),'n',NULL)`),
    ).resolves.toBeDefined();
    await expect(
      testDS.query(`INSERT INTO templates (id,name,methodology) VALUES (gen_random_uuid(),'a','agile')`),
    ).rejects.toThrow(/templates_methodology_check|violates check/i);
    await expect(
      testDS.query(`INSERT INTO templates (id,name,methodology) VALUES (gen_random_uuid(),'s','scrum')`),
    ).resolves.toBeDefined();
  });

  it('down(): drops the CHECK (agile insert allowed again); data forward-only', async () => {
    if (!dbReady || !testDS) return;
    const qr = testDS.createQueryRunner();
    await qr.connect();
    await new AD029TemplateMethodologyCleanup18000000000204().down(qr);
    await qr.release();

    // CHECK gone — 'agile' insert allowed again.
    await expect(
      testDS.query(`INSERT INTO templates (id,name,methodology) VALUES (gen_random_uuid(),'a2','agile')`),
    ).resolves.toBeDefined();
    // Data not reverted (forward-only): scrum stays scrum, archives stay archived.
    expect((await one(AGILE_SCRUM)).methodology).toBe('scrum');
    expect((await one(DUP)).archived_at).not.toBeNull();
  });
});
