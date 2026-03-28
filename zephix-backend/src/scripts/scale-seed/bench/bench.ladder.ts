/**
 * Phase 5A Step 2D: Scale ladder.
 *
 * Runs bench at multiple scale values: 0.05, 0.1, 0.25, 0.5, 1.0.
 * Enforces strictSchema=true (must have full DB schema).
 * Writes a single ladder summary JSON.
 */
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { runBench, BenchConfig, BenchResult } from './bench.runner';
import { writeProgress, clearProgress, readProgress } from './progress';

const LADDER_SCALES = [0.05, 0.1, 0.25, 0.5, 1.0];

export interface LadderEntry {
  scale: number;
  status: 'success' | 'strict_schema_fail' | 'error';
  result?: BenchResult;
  error?: string;
}

export interface LadderResult {
  seed: number;
  orgSlug: string;
  scales: number[];
  entries: LadderEntry[];
  createdAt: string;
}

function parseLadderArg(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

export async function runLadder(ds: DataSource, cliArgs: string[]): Promise<LadderResult> {
  const seedRaw = parseLadderArg(cliArgs, 'seed');
  if (!seedRaw) throw new Error('--seed=<number> is required');
  const seed = parseInt(seedRaw, 10);
  const orgSlug = parseLadderArg(cliArgs, 'orgSlug') ?? 'scale-seed';
  const batch = parseInt(parseLadderArg(cliArgs, 'batch') ?? '5000', 10);
  const repeat = parseInt(parseLadderArg(cliArgs, 'repeat') ?? '1', 10);

  // Enterprise guardrail: ladder must use strictSchema=true
  const strictRaw = parseLadderArg(cliArgs, 'strictSchema');
  if (strictRaw === 'false') {
    throw new Error(
      'LADDER_GUARDRAIL: --strictSchema=false is not allowed for ladder. ' +
      'Ladder must run against a fully migrated DB. Use db:seed:scale for flexible seeding.',
    );
  }

  const log = (msg: string): void => console.log(`[ladder] ${msg}`);

  log(`Scale ladder: seed=${seed} scales=[${LADDER_SCALES.join(', ')}] strictSchema=true`);

  const entries: LadderEntry[] = [];

  for (const scale of LADDER_SCALES) {
    log(`\n═══ Scale ${scale} ═══`);

    writeProgress({
      command: 'ladder',
      seed,
      scale,
      stage: `scale_${scale}_start`,
      completedStages: entries.filter(e => e.status === 'success').map(e => `scale_${e.scale}`),
      lastUpdatedAt: '',
    });

    const benchCfg: BenchConfig = {
      seed,
      scale,
      orgSlug,
      repeat,
      strictSchema: true, // enforced for ladder
      explain: true,
      logSql: false,
      batch,
    };

    try {
      const result = await runBench(ds, benchCfg, cliArgs);
      entries.push({ scale, status: 'success', result });
    } catch (err) {
      const errMsg = (err as Error).message ?? String(err);
      // Check if this was a strict schema failure (process.exit(1) in runner)
      if (errMsg.includes('STRICT_SCHEMA_VIOLATION') || errMsg.includes('Missing required tables') || errMsg.includes('SCHEMA_DRIFT')) {
        log(`  STRICT SCHEMA FAIL: ${errMsg.slice(0, 200)}`);
        entries.push({ scale, status: 'strict_schema_fail', error: errMsg.slice(0, 500) });
        // Stop the ladder — if schema is missing at one scale, it's missing for all
        log('  STOPPING LADDER: strict schema requirement not met');
        break;
      } else {
        log(`  ERROR: ${errMsg.slice(0, 200)}`);
        entries.push({ scale, status: 'error', error: errMsg.slice(0, 500) });
      }
    }
  }

  const ladderResult: LadderResult = {
    seed,
    orgSlug,
    scales: LADDER_SCALES,
    entries,
    createdAt: new Date().toISOString(),
  };

  // Write results
  const dir = path.resolve(
    __dirname,
    '../../../../../docs/architecture/proofs/phase5a',
  );
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(dir, `ladder-seed-${seed}.json`),
    JSON.stringify(ladderResult, null, 2) + '\n',
  );

  // Write resume proof showing what completed and what was skipped
  const resumeProof = {
    command: 'ladder',
    seed,
    completedScales: entries.filter(e => e.status === 'success').map(e => e.scale),
    failedScales: entries.filter(e => e.status !== 'success').map(e => ({ scale: e.scale, status: e.status, error: e.error?.slice(0, 200) })),
    skippedScales: LADDER_SCALES.filter(s => !entries.some(e => e.scale === s)),
    completedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(dir, `ladder-resume-proof-seed-${seed}.json`),
    JSON.stringify(resumeProof, null, 2) + '\n',
  );

  clearProgress();

  log('\n─── LADDER SUMMARY ───');
  for (const e of entries) {
    if (e.status === 'success' && e.result) {
      const s = e.result.summary;
      log(`  Scale ${e.scale}: ${s.avgRuntimeMs}ms | ${s.avgInsertRate} rows/sec | ${s.avgMemoryRssMb}MB RSS`);
    } else {
      log(`  Scale ${e.scale}: ${e.status} — ${e.error?.slice(0, 100) ?? ''}`);
    }
  }

  return ladderResult;
}
