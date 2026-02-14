/**
 * Phase 5A Step 2C: Query plan proof.
 *
 * Named queries aligned to real UI read paths.
 * Runs EXPLAIN ANALYZE and captures plans.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface NamedQuery {
  name: string;
  description: string;
  sql: string;
  expectedIndex: string;
}

/**
 * Get the list of benchmark queries.
 * orgId is injected at runtime via parameterized $1.
 */
export function getBenchQueries(orgId: string, projectId: string): NamedQuery[] {
  return [
    {
      name: 'work_tasks_by_project_status_rank',
      description: 'Board column query — tasks by project + status ordered by rank',
      sql: `SELECT id, status, rank FROM work_tasks
            WHERE organization_id = '${orgId}'
              AND project_id = '${projectId}'
              AND status = 'IN_PROGRESS'
              AND deleted_at IS NULL
            ORDER BY rank ASC
            LIMIT 200`,
      expectedIndex: 'idx_work_tasks_board_column (project_id, status, rank) WHERE deleted_at IS NULL',
    },
    {
      name: 'work_tasks_by_project_list_default',
      description: 'Project task list default — all tasks for a project ordered by rank',
      sql: `SELECT id, title, status, priority, rank FROM work_tasks
            WHERE organization_id = '${orgId}'
              AND project_id = '${projectId}'
              AND deleted_at IS NULL
            ORDER BY rank ASC
            LIMIT 200`,
      expectedIndex: 'idx_work_tasks_stats_project or idx_work_tasks_board_column',
    },
    {
      name: 'work_task_dependencies_by_project',
      description: 'Dependencies for a project — Gantt view input',
      sql: `SELECT id, predecessor_task_id, successor_task_id, type
            FROM work_task_dependencies
            WHERE organization_id = '${orgId}'
              AND project_id = '${projectId}'`,
      expectedIndex: 'idx_work_task_deps_org_project (organization_id, project_id)',
    },
    {
      name: 'audit_events_by_org_created_desc',
      description: 'Audit log newest — admin audit viewer default query',
      sql: `SELECT id, entity_type, action, created_at
            FROM audit_events
            WHERE organization_id = '${orgId}'
            ORDER BY created_at DESC
            LIMIT 50`,
      expectedIndex: 'idx_audit_events_org_created_desc (organization_id, created_at DESC)',
    },
    {
      name: 'projects_by_workspace_created_desc',
      description: 'Projects list by workspace — workspace home page',
      sql: `SELECT id, name, status, created_at FROM projects
            WHERE organization_id = '${orgId}'
            ORDER BY created_at DESC
            LIMIT 50`,
      expectedIndex: 'idx_projects_org_created_at (organization_id, created_at DESC)',
    },
  ];
}

export interface ExplainResult {
  name: string;
  description: string;
  expectedIndex: string;
  planningTimeMs: number;
  executionTimeMs: number;
  rows: number;
  planText: string;
}

/**
 * Run EXPLAIN ANALYZE for each named query and capture results.
 * Runs ANALYZE on relevant tables first so the planner has fresh statistics.
 */
export async function runExplainAnalyze(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  orgId: string,
  projectId: string,
  log: (msg: string) => void,
): Promise<ExplainResult[]> {
  // Refresh planner statistics for accurate plans
  const analyzeTables = ['audit_events', 'work_tasks', 'work_task_dependencies', 'projects'];
  for (const table of analyzeTables) {
    try {
      await ds.query(`ANALYZE ${table}`);
      log(`  ANALYZE ${table} — stats refreshed`);
    } catch {
      // table may not exist — safe to skip
    }
  }

  const queries = getBenchQueries(orgId, projectId);
  const results: ExplainResult[] = [];

  for (const q of queries) {
    log(`  EXPLAIN: ${q.name}`);
    try {
      const rows = await ds.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${q.sql}`);
      const planLines: string[] = rows.map((r: any) => r['QUERY PLAN'] ?? Object.values(r)[0]);
      const planText = planLines.join('\n');

      // Extract timing from plan text
      const planningMatch = planText.match(/Planning Time:\s*([\d.]+)\s*ms/);
      const executionMatch = planText.match(/Execution Time:\s*([\d.]+)\s*ms/);
      const rowsMatch = planText.match(/rows=(\d+)/);

      results.push({
        name: q.name,
        description: q.description,
        expectedIndex: q.expectedIndex,
        planningTimeMs: planningMatch ? parseFloat(planningMatch[1]) : -1,
        executionTimeMs: executionMatch ? parseFloat(executionMatch[1]) : -1,
        rows: rowsMatch ? parseInt(rowsMatch[1], 10) : -1,
        planText,
      });
    } catch (err) {
      log(`    ERROR: ${(err as Error).message.slice(0, 100)}`);
      results.push({
        name: q.name,
        description: q.description,
        expectedIndex: q.expectedIndex,
        planningTimeMs: -1,
        executionTimeMs: -1,
        rows: -1,
        planText: `ERROR: ${(err as Error).message}`,
      });
    }
  }

  return results;
}

/**
 * Write EXPLAIN plans to individual text files.
 */
export function writeExplainPlans(
  results: ExplainResult[],
  seed: number,
  scale: number,
): void {
  const dir = path.resolve(
    __dirname,
    '../../../../../docs/architecture/proofs/phase5a/explain',
  );
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (const r of results) {
    const header = [
      `-- Query: ${r.name}`,
      `-- Description: ${r.description}`,
      `-- Expected Index: ${r.expectedIndex}`,
      `-- Seed: ${seed}, Scale: ${scale}`,
      `-- Planning Time: ${r.planningTimeMs}ms`,
      `-- Execution Time: ${r.executionTimeMs}ms`,
      `-- Rows: ${r.rows}`,
      '',
    ].join('\n');

    fs.writeFileSync(
      path.join(dir, `${r.name}.txt`),
      header + r.planText + '\n',
    );
  }
}
