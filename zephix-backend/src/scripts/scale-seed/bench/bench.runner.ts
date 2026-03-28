/**
 * Phase 5A Step 2B: Benchmark runner.
 *
 * Runs seed → metrics → explain → cleanup, repeats N times.
 * Captures timing, memory, insert rate.
 * Writes results to docs/architecture/proofs/phase5a/.
 */
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { parseConfig, ScaleSeedConfig } from '../scale-seed.config';
import { runSeed } from '../scale-seed.runner';
import { runCleanup } from '../cleanup/cleanup.runner';
import { stableId, tableExists, getTableColumns, computeSchemaHash } from '../scale-seed.utils';
import { runExplainAnalyze, writeExplainPlans, ExplainResult } from './bench.queries';
import { writeProgress, clearProgress, ProgressState } from './progress';

export interface BenchConfig {
  seed: number;
  scale: number;
  orgSlug: string;
  repeat: number;
  strictSchema: boolean;
  explain: boolean;
  logSql: boolean;
  batch: number;
}

export interface BenchRunResult {
  iteration: number;
  runtimeMs: number;
  nodeMemoryRssMb: number;
  nodeHeapUsedMb: number;
  insertRateRowsPerSec: number;
  counts: Record<string, number>;
  detectedSchemaHash: string;
  skippedTables: string[];
}

export interface BenchResult {
  seed: number;
  scale: number;
  repeat: number;
  runs: BenchRunResult[];
  explainPlans: ExplainResult[];
  summary: {
    avgRuntimeMs: number;
    avgInsertRate: number;
    avgMemoryRssMb: number;
    avgMemoryHeapMb: number;
  };
  createdAt: string;
}

function parseBenchArg(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

export function parseBenchConfig(argv: string[]): BenchConfig {
  const seedRaw = parseBenchArg(argv, 'seed');
  if (!seedRaw) throw new Error('--seed=<number> is required');
  const seed = parseInt(seedRaw, 10);
  if (Number.isNaN(seed) || seed <= 0) throw new Error('--seed must be a positive integer');

  // Enterprise guardrail: bench must use strictSchema=true
  const strictRaw = parseBenchArg(argv, 'strictSchema');
  if (strictRaw === 'false') {
    throw new Error(
      'BENCH_GUARDRAIL: --strictSchema=false is not allowed for bench. ' +
      'Benchmarks must run against a fully migrated DB. Use db:seed:scale for flexible seeding.',
    );
  }

  return {
    seed,
    scale: parseFloat(parseBenchArg(argv, 'scale') ?? '0.1'),
    orgSlug: parseBenchArg(argv, 'orgSlug') ?? 'scale-seed',
    repeat: parseInt(parseBenchArg(argv, 'repeat') ?? '3', 10),
    strictSchema: true, // always true for bench
    explain: parseBenchArg(argv, 'explain') !== 'false', // default true
    logSql: parseBenchArg(argv, 'logSql') === 'true',
    batch: parseInt(parseBenchArg(argv, 'batch') ?? '5000', 10),
  };
}

/**
 * Detect schema drift by comparing current schema hash to the last manifest for this seed.
 * Returns the previous hash or null if no manifest found.
 */
function detectSchemaDrift(seed: number, currentHash: string, log: (msg: string) => void): void {
  const proofDir = path.resolve(__dirname, '../../../../../docs/architecture/proofs/phase5a');
  const manifestPath = path.join(proofDir, `seed-manifest-seed-${seed}.json`);

  if (!fs.existsSync(manifestPath)) {
    log('  No previous manifest found — skipping drift check');
    return;
  }

  try {
    const prev = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const prevHash = prev.detectedSchemaHash;
    if (prevHash && prevHash !== currentHash) {
      throw new Error(
        `SCHEMA_DRIFT: Current schema hash ${currentHash} differs from previous manifest hash ${prevHash}. ` +
        `The database schema has changed since the last seed run. ` +
        `Investigate the change before benchmarking.`,
      );
    }
    log(`  Schema hash matches previous manifest: ${currentHash}`);
  } catch (err) {
    if ((err as Error).message.startsWith('SCHEMA_DRIFT')) throw err;
    log(`  Could not read previous manifest — skipping drift check`);
  }
}

export async function runBench(ds: DataSource, benchCfg: BenchConfig, cliArgs: string[]): Promise<BenchResult> {
  const log = (msg: string): void => {
    console.log(`[bench] ${msg}`);
  };

  log(`Benchmark: seed=${benchCfg.seed} scale=${benchCfg.scale} repeat=${benchCfg.repeat} strict=${benchCfg.strictSchema} explain=${benchCfg.explain}`);

  // Schema drift alarm — compare current DB schema hash to last manifest
  log('Schema drift check...');
  const ALL_SEED_TABLES = [
    'organizations', 'users', 'user_organizations', 'workspaces',
    'workspace_members', 'projects', 'work_tasks', 'work_task_dependencies',
    'schedule_baselines', 'schedule_baseline_items',
    'earned_value_snapshots', 'workspace_member_capacity',
    'attachments', 'workspace_storage_usage', 'audit_events',
  ];
  const tableColumnMap: Record<string, string[]> = {};
  for (const t of ALL_SEED_TABLES) {
    const exists = await tableExists(ds, t);
    if (exists) {
      const cols = await getTableColumns(ds, t);
      tableColumnMap[t] = Array.from(cols).sort();
    }
  }
  const currentHash = computeSchemaHash(tableColumnMap);
  detectSchemaDrift(benchCfg.seed, currentHash, log);

  const runs: BenchRunResult[] = [];
  let lastExplainPlans: ExplainResult[] = [];

  for (let i = 0; i < benchCfg.repeat; i++) {
    log(`\n─── Iteration ${i + 1}/${benchCfg.repeat} ───`);

    // Progress tracking
    const progress: ProgressState = {
      command: 'bench',
      seed: benchCfg.seed,
      scale: benchCfg.scale,
      stage: `iteration_${i + 1}_seed`,
      completedStages: runs.map((_, idx) => `iteration_${idx + 1}`),
      lastUpdatedAt: '',
    };
    writeProgress(progress);

    // Build seed config from bench args
    const seedCfg: ScaleSeedConfig = parseConfig([
      `--seed=${benchCfg.seed}`,
      `--scale=${benchCfg.scale}`,
      `--orgSlug=${benchCfg.orgSlug}`,
      `--batch=${benchCfg.batch}`,
      `--strictSchema=${benchCfg.strictSchema}`,
    ]);

    // Force GC if available
    if (global.gc) global.gc();
    const memBefore = process.memoryUsage();
    const startMs = Date.now();

    // Seed
    await runSeed(ds, seedCfg);
    const runtimeMs = Date.now() - startMs;
    const memAfter = process.memoryUsage();

    // Read manifest from org settings to get counts and metadata
    const orgId = stableId('org', `${benchCfg.seed}:${benchCfg.orgSlug}`);
    const orgRows = await ds.query(
      `SELECT settings FROM organizations WHERE id = $1`,
      [orgId],
    );
    const manifest = orgRows[0]?.settings?.scaleSeed;
    const counts: Record<string, number> = manifest?.counts ?? {};
    const totalRows = Object.values(counts).reduce((s: number, c: number) => s + c, 0);

    const runResult: BenchRunResult = {
      iteration: i + 1,
      runtimeMs,
      nodeMemoryRssMb: Math.round((memAfter.rss / 1024 / 1024) * 100) / 100,
      nodeHeapUsedMb: Math.round((memAfter.heapUsed / 1024 / 1024) * 100) / 100,
      insertRateRowsPerSec: Math.round(totalRows / (runtimeMs / 1000)),
      counts,
      detectedSchemaHash: manifest?.detectedSchemaHash ?? '',
      skippedTables: manifest?.skippedTables ?? [],
    };

    log(`  Runtime: ${runtimeMs}ms | Rows: ${totalRows} | Rate: ${runResult.insertRateRowsPerSec} rows/sec`);
    log(`  Memory RSS: ${runResult.nodeMemoryRssMb}MB | Heap: ${runResult.nodeHeapUsedMb}MB`);

    runs.push(runResult);

    // Run EXPLAIN on last iteration (data is in DB)
    if (benchCfg.explain && i === benchCfg.repeat - 1) {
      progress.stage = `iteration_${i + 1}_explain`;
      writeProgress(progress);

      // Pick a project for explain queries
      const projRows = await ds.query(
        `SELECT id FROM projects WHERE organization_id = $1 LIMIT 1`,
        [orgId],
      );
      const projectId = projRows[0]?.id;

      if (projectId) {
        log('\n─── EXPLAIN ANALYZE ───');
        lastExplainPlans = await runExplainAnalyze(ds, orgId, projectId, log);
        writeExplainPlans(lastExplainPlans, benchCfg.seed, benchCfg.scale);
        log(`  Plans written to docs/architecture/proofs/phase5a/explain/`);
      } else {
        log('  SKIP explain: no projects found');
      }
    }

    // Cleanup
    progress.stage = `iteration_${i + 1}_cleanup`;
    writeProgress(progress);

    await runCleanup(ds, { seed: benchCfg.seed, orgSlug: benchCfg.orgSlug });

    progress.completedStages.push(`iteration_${i + 1}`);
    writeProgress(progress);
  }

  // Compute summary
  const avgRuntime = Math.round(runs.reduce((s, r) => s + r.runtimeMs, 0) / runs.length);
  const avgRate = Math.round(runs.reduce((s, r) => s + r.insertRateRowsPerSec, 0) / runs.length);
  const avgRss = Math.round((runs.reduce((s, r) => s + r.nodeMemoryRssMb, 0) / runs.length) * 100) / 100;
  const avgHeap = Math.round((runs.reduce((s, r) => s + r.nodeHeapUsedMb, 0) / runs.length) * 100) / 100;

  const result: BenchResult = {
    seed: benchCfg.seed,
    scale: benchCfg.scale,
    repeat: benchCfg.repeat,
    runs,
    explainPlans: lastExplainPlans,
    summary: {
      avgRuntimeMs: avgRuntime,
      avgInsertRate: avgRate,
      avgMemoryRssMb: avgRss,
      avgMemoryHeapMb: avgHeap,
    },
    createdAt: new Date().toISOString(),
  };

  // Write results
  writeBenchResults(result);
  clearProgress();

  log('\n─── BENCH SUMMARY ───');
  log(`  Avg Runtime: ${avgRuntime}ms`);
  log(`  Avg Insert Rate: ${avgRate} rows/sec`);
  log(`  Avg Memory RSS: ${avgRss}MB | Heap: ${avgHeap}MB`);
  log(`  Schema Hash: ${runs[0]?.detectedSchemaHash ?? 'N/A'}`);
  if (runs[0]?.skippedTables?.length > 0) {
    log(`  Skipped Tables: ${runs[0].skippedTables.join(', ')}`);
  }

  return result;
}

function writeBenchResults(result: BenchResult): void {
  const dir = path.resolve(
    __dirname,
    '../../../../../docs/architecture/proofs/phase5a',
  );
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const base = `bench-seed-${result.seed}-scale-${result.scale}`;

  // JSON
  fs.writeFileSync(
    path.join(dir, `${base}.json`),
    JSON.stringify(result, null, 2) + '\n',
  );

  // Markdown
  const lines: string[] = [
    `# Benchmark — seed=${result.seed} scale=${result.scale}`,
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Iterations | ${result.repeat} |`,
    `| Avg Runtime | ${result.summary.avgRuntimeMs}ms |`,
    `| Avg Insert Rate | ${result.summary.avgInsertRate} rows/sec |`,
    `| Avg Memory RSS | ${result.summary.avgMemoryRssMb}MB |`,
    `| Avg Heap Used | ${result.summary.avgMemoryHeapMb}MB |`,
    `| Schema Hash | \`${result.runs[0]?.detectedSchemaHash ?? 'N/A'}\` |`,
    '',
    '## Per-Iteration Results',
    '',
    '| # | Runtime (ms) | Rows/sec | RSS (MB) | Heap (MB) |',
    '|---|-------------|---------|---------|----------|',
  ];
  for (const r of result.runs) {
    lines.push(`| ${r.iteration} | ${r.runtimeMs} | ${r.insertRateRowsPerSec} | ${r.nodeMemoryRssMb} | ${r.nodeHeapUsedMb} |`);
  }

  if (result.runs[0]?.skippedTables?.length > 0) {
    lines.push('');
    lines.push('## Skipped Tables');
    lines.push('');
    for (const t of result.runs[0].skippedTables) {
      lines.push(`- ${t}`);
    }
  }

  if (result.explainPlans.length > 0) {
    lines.push('');
    lines.push('## EXPLAIN Summary');
    lines.push('');
    lines.push('| Query | Planning (ms) | Execution (ms) | Rows |');
    lines.push('|-------|--------------|----------------|------|');
    for (const p of result.explainPlans) {
      lines.push(`| ${p.name} | ${p.planningTimeMs} | ${p.executionTimeMs} | ${p.rows} |`);
    }
  }

  lines.push('');
  fs.writeFileSync(path.join(dir, `${base}.md`), lines.join('\n') + '\n');
}
