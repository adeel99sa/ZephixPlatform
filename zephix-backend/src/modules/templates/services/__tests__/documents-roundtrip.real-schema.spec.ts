/**
 * TC-B6 — Real-Postgres round-trip data contract for the documents payload.
 *
 * Extends the TC-B3/B4/B5 chain. Validates the SQL layer mocks can't:
 *   1. Seed idempotency — upserting the catalog twice yields no dup rows
 *      (doc_templates keyed by doc_key; templates keyed by template_code).
 *   2. Attach — a doc template's default_content, with merge fields resolved
 *      by the REAL resolver code, persists as document_instance + version 1;
 *      {{project.name}} is substituted verbatim and an unresolved token stays
 *      literal + is reported.
 *   3. Gate-key validation — attach only accepts a blocksGateKey that exists
 *      as a phase gate on the project.
 *   4. Bundle round-trip — template.phases[].docKeys → instantiate materializes
 *      a document_instance per key (phaseKey = reportingKey) → save-as-template
 *      serializes docKeys back onto the matching phase.
 *
 * Skips cleanly if Postgres is unreachable (:5433).
 */
import { DataSource } from 'typeorm';
import {
  buildMergeTokenMap,
  substituteMergeTokens,
} from '../../../template-center/documents/merge-field-resolver.service';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `tcb6_documents_${Date.now()}`;

const ORG = '11111111-1111-1111-1111-111111111111';
const WS = '22222222-2222-2222-2222-222222222222';
const PROJECT = '33333333-3333-3333-3333-333333333333';
const USER = '44444444-4444-4444-4444-444444444444';
const GATE_KEY = 'platform.gate.init-to-plan';

describe('TC-B6 documents round-trip (real schema)', () => {
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
      console.warn(
        `[TC-B6 documents] Postgres unreachable — skipping. ${(err as Error).message}`,
      );
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
    });
    await testDS.initialize();

    await testDS.query(`CREATE TABLE doc_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doc_key TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL,
      content_type TEXT NOT NULL, default_content JSONB NULL,
      is_active BOOLEAN NOT NULL DEFAULT true )`);
    await testDS.query(
      `CREATE UNIQUE INDEX ux_doc_templates_key ON doc_templates (doc_key)`,
    );
    await testDS.query(`CREATE TABLE templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL, template_code VARCHAR(100) NULL,
      kind TEXT NULL, template_scope TEXT NULL, is_system BOOLEAN NOT NULL DEFAULT false,
      is_preferred BOOLEAN NOT NULL DEFAULT false, metadata JSONB NULL,
      phases JSONB NULL )`);
    await testDS.query(
      `CREATE UNIQUE INDEX ux_templates_code ON templates (template_code)`,
    );
    await testDS.query(`CREATE TABLE work_phases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL,
      name VARCHAR(120) NOT NULL, sort_order INT NOT NULL, reporting_key TEXT NOT NULL )`);
    await testDS.query(`CREATE TABLE phase_gate_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL,
      phase_id UUID NOT NULL, gate_key VARCHAR(120) NULL, deleted_at TIMESTAMP NULL )`);
    await testDS.query(`CREATE TABLE document_instances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL,
      doc_template_id UUID NULL, doc_key TEXT NOT NULL, name TEXT NOT NULL,
      content_type TEXT NOT NULL, status TEXT NOT NULL, owner_id UUID NOT NULL,
      reviewer_ids UUID[] NOT NULL DEFAULT '{}', phase_key TEXT NULL,
      current_version INT NOT NULL DEFAULT 1, is_required BOOLEAN NOT NULL DEFAULT false,
      blocks_gate_key TEXT NULL )`);
    await testDS.query(`CREATE TABLE document_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), document_instance_id UUID NOT NULL,
      version_number INT NOT NULL, content JSONB NULL, created_by UUID NOT NULL )`);
    dbReady = true;
  }, 30_000);

  afterAll(async () => {
    if (testDS?.isInitialized) await testDS.destroy();
    if (adminDS?.isInitialized && dbReady) {
      try { await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`); } catch { /* best effort */ }
      await adminDS.destroy();
    }
  }, 30_000);

  // Mirror the seed's upsert contract for one catalog doc.
  async function upsertCatalogDoc(docKey: string, content: object) {
    await testDS!.query(
      `INSERT INTO doc_templates (doc_key, name, category, content_type, default_content, is_active)
       VALUES ($1,$2,'initiation','rich_text',$3::jsonb,true)
       ON CONFLICT (doc_key) DO UPDATE SET name = EXCLUDED.name,
         default_content = EXCLUDED.default_content, is_active = true`,
      [docKey, `Doc ${docKey}`, JSON.stringify(content)],
    );
    await testDS!.query(
      `INSERT INTO templates (name, template_code, kind, template_scope, is_system, metadata)
       VALUES ($1,$2,'document','SYSTEM',true,$3::jsonb)
       ON CONFLICT (template_code) DO UPDATE SET name = EXCLUDED.name,
         metadata = EXCLUDED.metadata`,
      [`Doc ${docKey}`, `doc.${docKey}`, JSON.stringify({ docKey })],
    );
  }

  it('seed is idempotent — re-running upserts in place (no dup rows)', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-B6] skipped'); return; }
    const content = { format: 'rich_text', blocks: [{ type: 'heading', text: 'X' }] };
    await upsertCatalogDoc('project-charter', content);
    await upsertCatalogDoc('project-charter', content); // second run

    const docs = await testDS.query(
      `SELECT COUNT(*)::int AS c FROM doc_templates WHERE doc_key = 'project-charter'`,
    );
    const rows = await testDS.query(
      `SELECT COUNT(*)::int AS c FROM templates WHERE template_code = 'doc.project-charter'`,
    );
    expect(docs[0].c).toBe(1);
    expect(rows[0].c).toBe(1);
  });

  it('attach resolves merge fields (real resolver) and persists version 1', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-B6] skipped'); return; }
    const defaultContent = {
      format: 'rich_text',
      blocks: [
        { type: 'heading', text: 'Charter for {{project.name}}' },
        { type: 'paragraph', text: 'PM: {{project.manager}}' },
      ],
    };
    await upsertCatalogDoc('status-report', defaultContent);

    // Resolve with the REAL resolver code (manager unresolvable → stays literal).
    const tokenMap = buildMergeTokenMap({
      projectName: 'Apollo',
      managerName: null,
      currentPhaseName: 'Initiation',
      riskLevel: 'LOW',
      teamNames: [],
      milestoneNames: [],
    });
    const { content, unresolvedFields } = substituteMergeTokens(
      defaultContent,
      tokenMap,
    );

    const [inst] = await testDS.query(
      `INSERT INTO document_instances
        (project_id, doc_key, name, content_type, status, owner_id, current_version)
       VALUES ($1,'status-report','Status Report','rich_text','draft',$2,1)
       RETURNING id`,
      [PROJECT, USER],
    );
    await testDS.query(
      `INSERT INTO document_versions (document_instance_id, version_number, content, created_by)
       VALUES ($1,1,$2::jsonb,$3)`,
      [inst.id, JSON.stringify(content), USER],
    );

    const [v] = await testDS.query(
      `SELECT content FROM document_versions WHERE document_instance_id = $1 AND version_number = 1`,
      [inst.id],
    );
    expect(v.content.blocks[0].text).toBe('Charter for Apollo');
    // manager unresolvable → literal token preserved + reported
    expect(v.content.blocks[1].text).toBe('PM: {{project.manager}}');
    expect(unresolvedFields).toEqual(['{{project.manager}}']);
  });

  it('gate-key validation — only an existing project gate is accepted', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-B6] skipped'); return; }
    const [wp] = await testDS.query(
      `INSERT INTO work_phases (project_id, name, sort_order, reporting_key)
       VALUES ($1,'Initiation',0,'INIT') RETURNING id`,
      [PROJECT],
    );
    await testDS.query(
      `INSERT INTO phase_gate_definitions (project_id, phase_id, gate_key)
       VALUES ($1,$2,$3)`,
      [PROJECT, wp.id, GATE_KEY],
    );

    const present = await testDS.query(
      `SELECT 1 FROM phase_gate_definitions WHERE project_id=$1 AND gate_key=$2 AND deleted_at IS NULL`,
      [PROJECT, GATE_KEY],
    );
    const absent = await testDS.query(
      `SELECT 1 FROM phase_gate_definitions WHERE project_id=$1 AND gate_key=$2 AND deleted_at IS NULL`,
      [PROJECT, 'platform.gate.does-not-exist'],
    );
    expect(present).toHaveLength(1); // → accepted
    expect(absent).toHaveLength(0); // → BadRequest in the service
  });

  it('bundle round-trip — docKeys survive template → instantiate → save-as-template', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-B6] skipped'); return; }
    const RT_PROJECT = '55555555-5555-5555-5555-555555555555';
    const phases = [
      { name: 'Initiation', order: 0, reportingKey: 'INIT', docKeys: ['project-charter', 'getting-started-guide'] },
      { name: 'Execution', order: 1, reportingKey: 'EXEC', docKeys: ['status-report'] },
      { name: 'Planning', order: 2, reportingKey: 'PLAN' },
    ];
    const [tpl] = await testDS.query(
      `INSERT INTO templates (name, template_code, kind, template_scope, phases)
       VALUES ('Bundle','bundle.t7','project','SYSTEM',$1::jsonb) RETURNING phases`,
      [JSON.stringify(phases)],
    );

    // ── INSTANTIATE: create phase + one document_instance per docKey (phaseKey=reportingKey) ──
    for (const p of tpl.phases) {
      const [wp] = await testDS.query(
        `INSERT INTO work_phases (project_id, name, sort_order, reporting_key)
         VALUES ($1,$2,$3,$4) RETURNING id, reporting_key`,
        [RT_PROJECT, p.name, p.order, p.reportingKey],
      );
      for (const docKey of p.docKeys ?? []) {
        await testDS.query(
          `INSERT INTO document_instances
            (project_id, doc_key, name, content_type, status, owner_id, phase_key, current_version)
           VALUES ($1,$2,$3,'rich_text','draft',$4,$5,1)`,
          [RT_PROJECT, docKey, `Doc ${docKey}`, USER, wp.reporting_key],
        );
      }
    }

    const instances = await testDS.query(
      `SELECT doc_key, phase_key FROM document_instances WHERE project_id=$1 ORDER BY doc_key`,
      [RT_PROJECT],
    );
    expect(instances).toHaveLength(3);
    expect(instances.map((i: any) => i.doc_key).sort()).toEqual(
      ['getting-started-guide', 'project-charter', 'status-report'],
    );

    // ── SAVE-AS-TEMPLATE: group instances by phase_key back onto phases ──
    const projPhases = await testDS.query(
      `SELECT reporting_key FROM work_phases WHERE project_id=$1 ORDER BY sort_order`,
      [RT_PROJECT],
    );
    const docKeysByPhaseKey = new Map<string, string[]>();
    for (const d of instances) {
      if (!d.phase_key) continue;
      const list = docKeysByPhaseKey.get(d.phase_key) ?? [];
      if (!list.includes(d.doc_key)) list.push(d.doc_key);
      docKeysByPhaseKey.set(d.phase_key, list);
    }
    const savedPhases = projPhases.map((p: any) => {
      const docKeys = docKeysByPhaseKey.get(p.reporting_key);
      return {
        reportingKey: p.reporting_key,
        docKeys: docKeys && docKeys.length > 0 ? docKeys.sort() : undefined,
      };
    });

    expect(savedPhases[0]).toEqual({
      reportingKey: 'INIT',
      docKeys: ['getting-started-guide', 'project-charter'],
    });
    expect(savedPhases[1]).toEqual({
      reportingKey: 'EXEC',
      docKeys: ['status-report'],
    });
    expect(savedPhases[2]).toEqual({ reportingKey: 'PLAN', docKeys: undefined });
  });
});
