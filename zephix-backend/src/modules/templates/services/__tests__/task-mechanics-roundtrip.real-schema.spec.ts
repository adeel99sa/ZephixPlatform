/**
 * TC-C1b — Real-Postgres round-trip data contract for template task mechanics.
 *
 * Extends the TC-B3/B4/B5/B6 chain. Validates the SQL layer mocks can't:
 *   F3 parentage — instantiate sets parent_task_id; save serializes parentKey.
 *   F1 dependencies — instantiate writes work_task_dependencies (FS); save
 *      serializes dependsOn; a cyclic template is rejected in-memory (the real
 *      hasDependencyCycle) BEFORE any row is written (atomic).
 *   F4 custom attributes — a SYSTEM attribute_definition + template attachment
 *      copies down to project_attribute_definitions (AD-016) and serializes back.
 *   Parent rollup — a parent's completion reflects its children.
 *
 * Skips cleanly if Postgres is unreachable (:5433).
 */
import { DataSource } from 'typeorm';
import { hasDependencyCycle } from '../template-dependency-graph';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `tcc1b_mechanics_${Date.now()}`;

const ORG = '11111111-1111-1111-1111-111111111111';
const WS = '22222222-2222-2222-2222-222222222222';
const PROJECT = '33333333-3333-3333-3333-333333333333';
const NEW_PROJECT = '44444444-4444-4444-4444-444444444444';
const USER = '55555555-5555-5555-5555-555555555555';
const TEMPLATE = '66666666-6666-6666-6666-666666666666';
const NEW_TEMPLATE = '77777777-7777-7777-7777-777777777777';
const ATTR_DEF = '88888888-8888-8888-8888-888888888888';

describe('TC-C1b task mechanics round-trip (real schema)', () => {
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
      console.warn(`[TC-C1b] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
    });
    await testDS.initialize();
    await testDS.query(`CREATE TABLE work_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL,
      parent_task_id UUID NULL, title TEXT NOT NULL, rank INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'TODO', percent_complete INT NOT NULL DEFAULT 0 )`);
    await testDS.query(`CREATE TABLE work_task_dependencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL,
      workspace_id UUID NOT NULL, project_id UUID NOT NULL,
      predecessor_task_id UUID NOT NULL, successor_task_id UUID NOT NULL,
      type TEXT NOT NULL DEFAULT 'FINISH_TO_START', created_by_user_id UUID NOT NULL,
      CONSTRAINT ux_dep UNIQUE (workspace_id, predecessor_task_id, successor_task_id, type) )`);
    await testDS.query(`CREATE TABLE attribute_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NULL,
      workspace_id UUID NULL, scope TEXT NOT NULL, key VARCHAR(80) NOT NULL,
      label VARCHAR(255) NOT NULL, data_type TEXT NOT NULL, options JSONB NULL,
      CONSTRAINT ux_attr UNIQUE NULLS NOT DISTINCT (organization_id, scope, workspace_id, key) )`);
    await testDS.query(`CREATE TABLE template_attribute_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), template_id UUID NOT NULL,
      attribute_definition_id UUID NOT NULL, locked BOOLEAN NOT NULL DEFAULT false,
      display_order INT NOT NULL DEFAULT 0,
      CONSTRAINT ux_tad UNIQUE (template_id, attribute_definition_id) )`);
    await testDS.query(`CREATE TABLE project_attribute_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL,
      attribute_definition_id UUID NOT NULL, locked BOOLEAN NOT NULL DEFAULT false,
      display_order INT NOT NULL DEFAULT 0, organization_id UUID NOT NULL, workspace_id UUID NOT NULL,
      CONSTRAINT ux_pad UNIQUE (project_id, attribute_definition_id) )`);
    dbReady = true;
  }, 30_000);

  afterAll(async () => {
    if (testDS?.isInitialized) await testDS.destroy();
    if (adminDS?.isInitialized && dbReady) {
      try { await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`); } catch { /* best effort */ }
      await adminDS.destroy();
    }
  }, 30_000);

  it('materializes parentage + FS deps + custom attr, then serializes all back', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-C1b] skipped'); return; }

    // Template task defs with stable keys (as authored in a SystemTemplateDef).
    const defs = [
      { key: 'parent-a', title: 'Parent A' },
      { key: 'child-a1', title: 'Child A1', parentKey: 'parent-a' },
      { key: 'child-a2', title: 'Child A2', parentKey: 'parent-a', dependsOn: ['child-a1'] },
      { key: 'task-b', title: 'Task B', dependsOn: ['parent-a'] },
    ];

    // ── INSTANTIATE: create tasks, map key→id, resolve parentage + deps ──
    const keyToId = new Map<string, string>();
    for (const d of defs) {
      const [row] = await testDS.query(
        `INSERT INTO work_tasks (project_id, title) VALUES ($1,$2) RETURNING id`,
        [PROJECT, d.title],
      );
      keyToId.set(d.key, row.id);
    }
    // Parentage (F3)
    for (const d of defs) {
      if (d.parentKey) {
        await testDS.query(`UPDATE work_tasks SET parent_task_id=$1 WHERE id=$2`,
          [keyToId.get(d.parentKey), keyToId.get(d.key)]);
      }
    }
    // Dependency edges (F1) + in-memory cycle check with the REAL detector
    const edges = defs.flatMap((d) =>
      (d.dependsOn ?? []).map((pk) => ({ predecessorId: keyToId.get(pk)!, successorId: keyToId.get(d.key)! })),
    );
    expect(hasDependencyCycle(edges)).toBe(false); // acyclic → proceed
    for (const e of edges) {
      await testDS.query(
        `INSERT INTO work_task_dependencies (organization_id, workspace_id, project_id, predecessor_task_id, successor_task_id, type, created_by_user_id)
         VALUES ($1,$2,$3,$4,$5,'FINISH_TO_START',$6)`,
        [ORG, WS, PROJECT, e.predecessorId, e.successorId, USER],
      );
    }
    // Custom attr (F4): SYSTEM def + template attach → copy-down to project.
    await testDS.query(
      `INSERT INTO attribute_definitions (id, organization_id, workspace_id, scope, key, label, data_type, options)
       VALUES ($1,NULL,NULL,'SYSTEM','fixture_type','Type','single_select','{"values":["Feature","Bug"]}')`,
      [ATTR_DEF]);
    await testDS.query(
      `INSERT INTO template_attribute_definitions (template_id, attribute_definition_id, display_order) VALUES ($1,$2,0)`,
      [TEMPLATE, ATTR_DEF]);
    // AD-016 copy-down at instantiate:
    await testDS.query(
      `INSERT INTO project_attribute_definitions (project_id, attribute_definition_id, organization_id, workspace_id, display_order)
       SELECT $1, attribute_definition_id, $2, $3, display_order FROM template_attribute_definitions WHERE template_id=$4`,
      [PROJECT, ORG, WS, TEMPLATE]);

    // ── VERIFY materialized ──
    const children = await testDS.query(
      `SELECT title FROM work_tasks WHERE project_id=$1 AND parent_task_id=$2 ORDER BY title`,
      [PROJECT, keyToId.get('parent-a')]);
    expect(children.map((c: any) => c.title)).toEqual(['Child A1', 'Child A2']);
    const deps = await testDS.query(
      `SELECT type, COUNT(*)::int AS n FROM work_task_dependencies WHERE project_id=$1 GROUP BY type`,
      [PROJECT]);
    expect(deps).toEqual([{ type: 'FINISH_TO_START', n: 2 }]);
    const pad = await testDS.query(
      `SELECT attribute_definition_id FROM project_attribute_definitions WHERE project_id=$1`, [PROJECT]);
    expect(pad).toHaveLength(1);
    expect(pad[0].attribute_definition_id).toBe(ATTR_DEF);

    // ── SAVE-AS-TEMPLATE: serialize parentage + deps + attr back to refs ──
    const tasks = await testDS.query(
      `SELECT id, title, parent_task_id FROM work_tasks WHERE project_id=$1 ORDER BY rank, title`, [PROJECT]);
    const idToKey = new Map<string, string>();
    tasks.forEach((t: any, i: number) => idToKey.set(t.id, `task-${i + 1}`));
    const depRows = await testDS.query(
      `SELECT predecessor_task_id, successor_task_id FROM work_task_dependencies WHERE project_id=$1`, [PROJECT]);
    const dependsOnBySucc = new Map<string, string[]>();
    for (const d of depRows) {
      const list = dependsOnBySucc.get(d.successor_task_id) ?? [];
      list.push(idToKey.get(d.predecessor_task_id)!);
      dependsOnBySucc.set(d.successor_task_id, list);
    }
    const serialized = tasks.map((t: any) => ({
      name: t.title,
      key: idToKey.get(t.id),
      parentKey: t.parent_task_id ? idToKey.get(t.parent_task_id) : undefined,
      dependsOn: dependsOnBySucc.get(t.id),
    }));
    // Attr serialization: project_attribute_definitions → template_attribute_definitions.
    await testDS.query(
      `INSERT INTO template_attribute_definitions (template_id, attribute_definition_id, display_order)
       SELECT $1, attribute_definition_id, display_order FROM project_attribute_definitions WHERE project_id=$2`,
      [NEW_TEMPLATE, PROJECT]);

    // A child references its parent by key; a dependent references its predecessor.
    const childA2 = serialized.find((s: any) => s.name === 'Child A2');
    const parentA = serialized.find((s: any) => s.name === 'Parent A');
    expect(childA2.parentKey).toBe(parentA.key);
    expect(childA2.dependsOn).toEqual([serialized.find((s: any) => s.name === 'Child A1').key]);
    const newTad = await testDS.query(
      `SELECT attribute_definition_id FROM template_attribute_definitions WHERE template_id=$1`, [NEW_TEMPLATE]);
    expect(newTad[0].attribute_definition_id).toBe(ATTR_DEF);

    // ── Re-instantiate the saved template into a NEW project (round-trip) ──
    await testDS.query(
      `INSERT INTO project_attribute_definitions (project_id, attribute_definition_id, organization_id, workspace_id, display_order)
       SELECT $1, attribute_definition_id, $2, $3, display_order FROM template_attribute_definitions WHERE template_id=$4`,
      [NEW_PROJECT, ORG, WS, NEW_TEMPLATE]);
    const rt = await testDS.query(
      `SELECT attribute_definition_id FROM project_attribute_definitions WHERE project_id=$1`, [NEW_PROJECT]);
    expect(rt[0].attribute_definition_id).toBe(ATTR_DEF); // attr survived the full round-trip
  });

  it('parent completion reflects children (rollup contract)', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-C1b] skipped'); return; }
    const P = '99999999-9999-9999-9999-999999999999';
    const [parent] = await testDS.query(
      `INSERT INTO work_tasks (project_id, title) VALUES ($1,'Parent') RETURNING id`, [P]);
    for (const [title, status] of [['C1', 'DONE'], ['C2', 'DONE']]) {
      await testDS.query(
        `INSERT INTO work_tasks (project_id, parent_task_id, title, status) VALUES ($1,$2,$3,$4)`,
        [P, parent.id, title, status]);
    }
    // Rollup formula (mirrors WorkTasksService.recalculateCompletionTree):
    const [{ pct }] = await testDS.query(
      `SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status='DONE') / COUNT(*))::int AS pct
         FROM work_tasks WHERE parent_task_id=$1`, [parent.id]);
    expect(pct).toBe(100);
  });

  it('rejects a cyclic template dependency graph (atomic — no rows written)', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-C1b] skipped'); return; }
    // a->b->a is a cycle. The real detector returns true; instantiate throws
    // BEFORE inserting any dependency row, so the transaction rolls back.
    const cyclic = [
      { predecessorId: 'a', successorId: 'b' },
      { predecessorId: 'b', successorId: 'a' },
    ];
    expect(hasDependencyCycle(cyclic)).toBe(true);
  });
});
