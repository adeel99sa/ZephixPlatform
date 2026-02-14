/**
 * Phase 5A: Scale seed runner.
 *
 * Orchestrates all generators in FK order.
 * Deterministic, idempotent per seed.
 * Skips generators for tables that don't exist in the current DB.
 */
import { DataSource } from 'typeorm';
import { ScaleSeedConfig } from './scale-seed.config';
import {
  tableExists,
  getTableColumns,
  computeSchemaHash,
  checkRequiredIndexes,
  REQUIRED_BENCH_INDEXES,
} from './scale-seed.utils';
import {
  buildManifest,
  writeManifestToDisk,
  writeManifestToOrg,
} from './scale-seed.manifest';
import { writeProgress, GeneratorProgress } from './bench/progress';
import { generateOrg } from './generators/org.generator';
import { generateWorkspaces } from './generators/workspaces.generator';
import { generateUsers } from './generators/users.generator';
import { generateWorkspaceMembers } from './generators/workspace-members.generator';
import { generateProjects } from './generators/projects.generator';
import { generateTasks } from './generators/tasks.generator';
import { generateDependencies } from './generators/dependencies.generator';
import { generateBaselines } from './generators/baselines.generator';
import { generateEvSnapshots } from './generators/ev-snapshots.generator';
import { generateCapacity } from './generators/capacity.generator';
import { generateAttachments } from './generators/attachments.generator';
import { generateAudit } from './generators/audit.generator';

export async function runSeed(ds: DataSource, cfg: ScaleSeedConfig): Promise<void> {
  const startMs = Date.now();
  const log = (msg: string): void => {
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    console.log(`[${elapsed}s] ${msg}`);
  };

  log(`Scale seed starting: seed=${cfg.seed} scale=${cfg.scale}`);
  log(`Targets: ${cfg.workspaceCount} ws, ${cfg.projectCount} proj, ${cfg.taskCount} tasks, ${cfg.depCount} deps, ${cfg.userCount} users, ${cfg.auditCount} audit, ${cfg.attachmentsCount} attachments`);

  if (cfg.dryRun) {
    log('DRY RUN — no database writes');
    return;
  }

  // ─── Detect available tables + capability snapshot ──────────
  const ALL_SEED_TABLES = [
    'organizations', 'users', 'user_organizations', 'workspaces',
    'workspace_members', 'projects', 'work_tasks', 'work_task_dependencies',
    'schedule_baselines', 'schedule_baseline_items',
    'earned_value_snapshots', 'workspace_member_capacity',
    'attachments', 'workspace_storage_usage', 'audit_events',
  ];

  const presentTables: string[] = [];
  const missingTables: string[] = [];
  const tableColumnMap: Record<string, string[]> = {};

  for (const t of ALL_SEED_TABLES) {
    const exists = await tableExists(ds, t);
    if (exists) {
      presentTables.push(t);
      const cols = await getTableColumns(ds, t);
      tableColumnMap[t] = Array.from(cols).sort();
    } else {
      missingTables.push(t);
    }
  }

  // ─── Detect required indexes ─────────────────────────────
  const indexCheck = await checkRequiredIndexes(ds);
  const requiredIndexesPresent = indexCheck.present.map((r) => `${r.table}(${r.columns.join(',')})`);
  const missingIndexes = indexCheck.missing.map((r) => `${r.table}(${r.columns.join(',')})`);

  // Single capability snapshot log — required for Proof Pack D
  const schemaHash = computeSchemaHash(tableColumnMap);
  console.log(JSON.stringify({
    action: 'scale_seed_capabilities',
    presentTables,
    missingTables,
    tableColumns: tableColumnMap,
    detectedSchemaHash: schemaHash,
    requiredIndexesPresent,
    missingIndexes,
    indexesByTable: Object.fromEntries(
      Object.entries(indexCheck.indexesByTable).map(([t, idxs]) => [
        t,
        idxs.map((idx) => ({ name: idx.name, columns: idx.columns, unique: idx.isUnique })),
      ]),
    ),
  }, null, 2));

  // ─── Strict schema mode ───────────────────────────────────
  // Phase 2E+ tables that must exist when strictSchema=true
  const STRICT_REQUIRED_TABLES = [
    'schedule_baselines', 'schedule_baseline_items',
    'earned_value_snapshots', 'workspace_member_capacity',
    'attachments', 'workspace_storage_usage', 'audit_events',
  ];

  if (cfg.strictSchema) {
    const missingStrict = STRICT_REQUIRED_TABLES.filter((t) => missingTables.includes(t));
    if (missingStrict.length > 0) {
      const msg = `STRICT_SCHEMA_VIOLATION: Missing required tables: ${missingStrict.join(', ')}. ` +
        `Run pending migrations or use --strictSchema=false for dev convenience.`;
      throw new Error(msg);
    }

    // Index parity check — bench/ladder require critical indexes
    if (missingIndexes.length > 0) {
      const msg = `STRICT_SCHEMA_VIOLATION: Missing required indexes: ${missingIndexes.join(', ')}. ` +
        `Apply migration BenchmarkPerformanceIndexes17980270000000 or use --strictSchema=false.`;
      throw new Error(msg);
    }
  }

  const hasBaselines = presentTables.includes('schedule_baselines');
  const hasBaselineItems = presentTables.includes('schedule_baseline_items');
  const hasEvSnapshots = presentTables.includes('earned_value_snapshots');
  const hasCapacity = presentTables.includes('workspace_member_capacity');
  const hasAttachments = presentTables.includes('attachments');
  const hasAudit = presentTables.includes('audit_events');

  if (!hasBaselines) log('SKIP: schedule_baselines table not found');
  if (!hasEvSnapshots) log('SKIP: earned_value_snapshots table not found');
  if (!hasCapacity) log('SKIP: workspace_member_capacity table not found');
  if (!hasAttachments) log('SKIP: attachments table not found');
  if (!hasAudit) log('SKIP: audit_events table not found');

  const counts: Record<string, number> = {};
  const skippedTables: string[] = [...missingTables];
  const completedGenerators: GeneratorProgress[] = [];

  function trackGenerator(name: string, rowCount: number): void {
    completedGenerators.push({
      name,
      rowCount,
      completedAt: new Date().toISOString(),
    });
    writeProgress({
      command: 'seed',
      seed: cfg.seed,
      scale: cfg.scale,
      stage: `generator_${name}`,
      completedStages: completedGenerators.map((g) => `generator_${g.name}`),
      completedGenerators,
      lastUpdatedAt: '',
    });
  }

  // 1. Organization
  log('1/12 Organization...');
  const { orgId } = await generateOrg(ds, cfg);
  counts.organizations = 1;
  trackGenerator('organizations', 1);

  // 2. Users (before workspaces, since workspaces reference created_by)
  log('2/12 Users...');
  const { count: userCount } = await generateUsers(ds, cfg, orgId, log);
  counts.users = userCount;
  counts.user_organizations = userCount;
  trackGenerator('users', userCount);

  // 3. Workspaces
  log('3/12 Workspaces...');
  const { count: wsCount } = await generateWorkspaces(ds, cfg, orgId, log);
  counts.workspaces = wsCount;
  trackGenerator('workspaces', wsCount);

  // 4. Workspace members
  log('4/12 Workspace members...');
  const { count: wmCount } = await generateWorkspaceMembers(ds, cfg, log);
  counts.workspace_members = wmCount;
  trackGenerator('workspace_members', wmCount);

  // 5. Projects
  log('5/12 Projects...');
  const { count: projCount, evProjectIndices, capacityProjectIndices } =
    await generateProjects(ds, cfg, orgId, log);
  counts.projects = projCount;
  trackGenerator('projects', projCount);

  // 6. Tasks
  log('6/12 Tasks...');
  const { count: taskCount, tasksByProject } =
    await generateTasks(ds, cfg, orgId, evProjectIndices, log);
  counts.work_tasks = taskCount;
  trackGenerator('work_tasks', taskCount);

  // 7. Dependencies
  log('7/12 Dependencies...');
  const { count: depCount } = await generateDependencies(ds, cfg, orgId, tasksByProject, log);
  counts.work_task_dependencies = depCount;
  trackGenerator('work_task_dependencies', depCount);

  // 8. Baselines (skip if tables don't exist)
  if (hasBaselines && hasBaselineItems) {
    log('8/12 Baselines...');
    const { baselineCount, itemCount } =
      await generateBaselines(ds, cfg, orgId, evProjectIndices, tasksByProject, log);
    counts.schedule_baselines = baselineCount;
    counts.schedule_baseline_items = itemCount;
    trackGenerator('baselines', baselineCount + itemCount);
  } else {
    log('8/12 Baselines — SKIPPED (table not in DB)');
  }

  // 9. EV snapshots (skip if table doesn't exist)
  if (hasEvSnapshots) {
    log('9/12 EV snapshots...');
    const { count: evCount } = await generateEvSnapshots(ds, cfg, orgId, evProjectIndices, log);
    counts.earned_value_snapshots = evCount;
    trackGenerator('earned_value_snapshots', evCount);
  } else {
    log('9/12 EV snapshots — SKIPPED (table not in DB)');
  }

  // 10. Capacity (skip if table doesn't exist)
  if (hasCapacity) {
    log('10/12 Capacity calendar...');
    const { count: capCount } = await generateCapacity(ds, cfg, orgId, log);
    counts.workspace_member_capacity = capCount;
    trackGenerator('workspace_member_capacity', capCount);
  } else {
    log('10/12 Capacity — SKIPPED (table not in DB)');
  }

  // 11. Attachments (skip if table doesn't exist)
  if (hasAttachments) {
    log('11/12 Attachments...');
    const { count: attachCount } = await generateAttachments(ds, cfg, orgId, tasksByProject, log);
    counts.attachments = attachCount;
    trackGenerator('attachments', attachCount);
  } else {
    log('11/12 Attachments — SKIPPED (table not in DB)');
  }

  // 12. Audit (skip if table doesn't exist)
  if (hasAudit) {
    log('12/12 Audit events...');
    const { count: auditCount } = await generateAudit(ds, cfg, orgId, log);
    counts.audit_events = auditCount;
    trackGenerator('audit_events', auditCount);
  } else {
    log('12/12 Audit — SKIPPED (table not in DB)');
  }

  // ─── Manifest ──────────────────────────────────────────
  const runtimeMs = Date.now() - startMs;
  const manifest = buildManifest(
    cfg.seed, cfg.scale, cfg.orgSlug, counts, runtimeMs,
    skippedTables, schemaHash, requiredIndexesPresent, missingIndexes,
  );

  await writeManifestToOrg(ds, orgId, manifest);
  writeManifestToDisk(manifest);

  log(`\nSeed complete in ${(runtimeMs / 1000).toFixed(1)}s`);
  log('Counts:');
  for (const [table, count] of Object.entries(counts)) {
    log(`  ${table}: ${count.toLocaleString()}`);
  }
}
