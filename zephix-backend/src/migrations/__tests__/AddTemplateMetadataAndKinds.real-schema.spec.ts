/**
 * TC-B1 — Real-schema up/down test for migration 18000000000203.
 *
 * Runs the ACTUAL migration class against a real Postgres schema (not mocked),
 * proving: is_preferred/usage_count are added with correct defaults; the kind
 * CHECK is extended to accept 'document'/'form' while still accepting the
 * live-read originals; and down() cleanly reverts (columns dropped, CHECK
 * restored so 'document' is rejected again).
 *
 * Skips cleanly if Postgres is unreachable (docker-compose.test-db.yml on :5433).
 */
import { DataSource } from 'typeorm';
import { AddTemplateMetadataAndKinds18000000000203 } from '../18000000000203-AddTemplateMetadataAndKinds';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `tcb1_migration_${Date.now()}`;

describe('Migration 203 — AddTemplateMetadataAndKinds (real-schema up/down)', () => {
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
        `[TC-B1 migration] Postgres at ${PG_HOST}:${PG_PORT} unreachable — skipping. ${(err as Error).message}`,
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

    // Minimal pre-migration `templates` shape with the live-read original kind
    // CHECK ({project,board,mixed}) — the exact starting state.
    await testDS.query(`
      CREATE TABLE "templates" (
        "id"   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(100) NOT NULL,
        "kind" VARCHAR(20) NOT NULL DEFAULT 'project',
        "template_scope" VARCHAR(20) NOT NULL DEFAULT 'ORG',
        CONSTRAINT "templates_kind_check"
          CHECK ((kind)::text = ANY (ARRAY['project','board','mixed']::text[]))
      )
    `);
    dbReady = true;
  }, 30_000);

  afterAll(async () => {
    if (testDS?.isInitialized) await testDS.destroy();
    if (adminDS?.isInitialized && dbReady) {
      try {
        await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
      } catch {
        /* best effort */
      }
      await adminDS.destroy();
    }
  }, 30_000);

  const cols = async (ds: DataSource): Promise<Record<string, any>> => {
    const rows: Array<{ column_name: string; column_default: string; is_nullable: string }> =
      await ds.query(
        `SELECT column_name, column_default, is_nullable FROM information_schema.columns WHERE table_name='templates'`,
      );
    return Object.fromEntries(rows.map((r) => [r.column_name, r]));
  };

  it('up(): adds columns with defaults and extends the kind allowlist to document/form', async () => {
    if (!dbReady || !testDS) {
      console.warn('[TC-B1 migration] skipped: postgres not available');
      return;
    }
    const qr = testDS.createQueryRunner();
    await qr.connect();
    await new AddTemplateMetadataAndKinds18000000000203().up(qr);
    await qr.release();

    const c = await cols(testDS);
    expect(c['is_preferred']).toBeDefined();
    expect(c['is_preferred'].is_nullable).toBe('NO');
    expect(c['is_preferred'].column_default).toMatch(/false/);
    expect(c['usage_count']).toBeDefined();
    expect(c['usage_count'].is_nullable).toBe('NO');
    expect(c['usage_count'].column_default).toMatch(/0/);

    // New kinds accepted.
    await expect(
      testDS.query(`INSERT INTO templates (name, kind) VALUES ('d','document')`),
    ).resolves.toBeDefined();
    await expect(
      testDS.query(`INSERT INTO templates (name, kind) VALUES ('f','form')`),
    ).resolves.toBeDefined();
    // Original kinds still accepted; defaults applied.
    const [row] = await testDS.query(
      `INSERT INTO templates (name, kind) VALUES ('p','project') RETURNING is_preferred, usage_count`,
    );
    expect(row.is_preferred).toBe(false);
    expect(Number(row.usage_count)).toBe(0);
    // Garbage still rejected.
    await expect(
      testDS.query(`INSERT INTO templates (name, kind) VALUES ('x','bogus')`),
    ).rejects.toThrow(/templates_kind_check|violates check/i);
  });

  it('down(): drops columns and restores the original kind allowlist (document rejected again)', async () => {
    if (!dbReady || !testDS) return;
    // Remove the document/form rows so the restored CHECK can be added.
    await testDS.query(`DELETE FROM templates WHERE kind IN ('document','form')`);

    const qr = testDS.createQueryRunner();
    await qr.connect();
    await new AddTemplateMetadataAndKinds18000000000203().down(qr);
    await qr.release();

    const c = await cols(testDS);
    expect(c['is_preferred']).toBeUndefined();
    expect(c['usage_count']).toBeUndefined();

    // 'document' rejected again under the restored constraint.
    await expect(
      testDS.query(`INSERT INTO templates (name, kind) VALUES ('d2','document')`),
    ).rejects.toThrow(/templates_kind_check|violates check/i);
    // 'project' still fine.
    await expect(
      testDS.query(`INSERT INTO templates (name, kind) VALUES ('p2','project')`),
    ).resolves.toBeDefined();
  });
});
