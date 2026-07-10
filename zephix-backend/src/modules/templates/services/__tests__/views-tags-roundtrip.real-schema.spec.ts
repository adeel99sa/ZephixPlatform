/**
 * TC-B5 — Real-Postgres round-trip for views + tags.
 *
 * Validates the JSONB/array SQL contract mocks can't: template columnConfig
 * (visibleTabs=enabledViews + defaultView) materializes onto project.columnConfig
 * and serializes back; task tags[] materialize onto work_tasks.tags and serialize
 * back. (The full service path is proven live in Stage-2; frontend honoring of
 * view config is TC-F — backend stores + round-trips only.)
 *
 * Skips cleanly if Postgres is unreachable (:5433).
 */
import { DataSource } from 'typeorm';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `tcb5_viewstags_${Date.now()}`;
const PROJECT = '33333333-3333-3333-3333-333333333333';

describe('TC-B5 views+tags round-trip (real schema)', () => {
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
      console.warn(`[TC-B5] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
    });
    await testDS.initialize();
    await testDS.query(`CREATE TABLE templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL,
      default_tabs JSONB NULL, column_config JSONB NULL, task_templates JSONB NULL )`);
    await testDS.query(`CREATE TABLE projects (
      id UUID PRIMARY KEY, column_config JSONB NULL )`);
    await testDS.query(`CREATE TABLE work_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL,
      title VARCHAR(200) NOT NULL, tags TEXT[] NULL )`);
    dbReady = true;
  }, 30_000);

  afterAll(async () => {
    if (testDS?.isInitialized) await testDS.destroy();
    if (adminDS?.isInitialized && dbReady) {
      try { await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`); } catch { /* best effort */ }
      await adminDS.destroy();
    }
  }, 30_000);

  it('view config + task tags survive template → instantiate → save-as-template', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-B5] skipped'); return; }

    // Template: enabledViews + defaultView + a tagged task.
    const [tpl] = await testDS.query(
      `INSERT INTO templates (name, default_tabs, column_config, task_templates)
       VALUES ('Kanban-ish', $1::jsonb, $2::jsonb, $3::jsonb)
       RETURNING default_tabs, column_config, task_templates`,
      [
        JSON.stringify(['overview', 'board', 'tasks', 'documents']),
        JSON.stringify({ defaultView: 'board' }),
        JSON.stringify([{ name: 'Bug', phaseOrder: 0, tags: ['bug', 'p0'] }]),
      ],
    );

    // ── INSTANTIATE contract: materialize onto project.columnConfig + work_tasks.tags ──
    const visibleTabs = tpl.default_tabs;
    const projectColumnConfig = { ...tpl.column_config, visibleTabs };
    await testDS.query(
      `INSERT INTO projects (id, column_config) VALUES ($1, $2::jsonb)`,
      [PROJECT, JSON.stringify(projectColumnConfig)],
    );
    for (const t of tpl.task_templates) {
      await testDS.query(
        `INSERT INTO work_tasks (project_id, title, tags) VALUES ($1, $2, $3)`,
        [PROJECT, t.name, Array.isArray(t.tags) && t.tags.length ? t.tags : null],
      );
    }

    // Project carries Board default + List enabled + the tagged task.
    const [proj] = await testDS.query(`SELECT column_config FROM projects WHERE id=$1`, [PROJECT]);
    expect(proj.column_config.defaultView).toBe('board');
    expect(proj.column_config.visibleTabs).toEqual(['overview', 'board', 'tasks', 'documents']);
    const [task] = await testDS.query(`SELECT title, tags FROM work_tasks WHERE project_id=$1`, [PROJECT]);
    expect(task.tags).toEqual(['bug', 'p0']);

    // ── SAVE-AS-TEMPLATE contract: serialize back to template ──
    const cc = proj.column_config;
    const savedTasks = (await testDS.query(
      `SELECT title, tags FROM work_tasks WHERE project_id=$1`,
      [PROJECT],
    )).map((wt: any) => ({ name: wt.title, tags: wt.tags ?? undefined }));
    const [resaved] = await testDS.query(
      `INSERT INTO templates (name, default_tabs, column_config, task_templates)
       VALUES ('Re-saved', $1::jsonb, $2::jsonb, $3::jsonb)
       RETURNING default_tabs, column_config, task_templates`,
      [JSON.stringify(cc.visibleTabs), JSON.stringify(cc), JSON.stringify(savedTasks)],
    );

    expect(resaved.default_tabs).toEqual(['overview', 'board', 'tasks', 'documents']);
    expect(resaved.column_config.defaultView).toBe('board');
    expect(resaved.task_templates[0].tags).toEqual(['bug', 'p0']);
  });
});
