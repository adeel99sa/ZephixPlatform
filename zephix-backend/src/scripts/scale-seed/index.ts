/**
 * Phase 5A: Scale seed CLI entry point.
 *
 * Uses a lightweight DataSource with zero entities — only raw SQL queries.
 * This avoids entity metadata errors from the shared AppDataSource.
 *
 * Commands:
 *   npm run db:seed:scale -- --seed=123 --scale=0.1
 *   npm run db:seed:scale:cleanup -- --seed=123
 *   npm run db:seed:scale:bench -- --seed=123 --scale=0.1 --repeat=3
 *   npm run db:seed:scale:ladder -- --seed=123
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { parseConfig } from './scale-seed.config';
import { runSeed } from './scale-seed.runner';
import { runCleanup } from './cleanup/cleanup.runner';
import { parseBenchConfig, runBench } from './bench/bench.runner';
import { runLadder } from './bench/bench.ladder';

config();

function createDataSource(logSql = false): DataSource {
  const url = process.env.DATABASE_URL;
  return new DataSource({
    type: 'postgres',
    url,
    ssl: url?.includes('railway') ? { rejectUnauthorized: false } : false,
    // No entities — scale seed uses raw SQL only
    entities: [],
    synchronize: false,
    logging: logSql,
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0]; // 'seed', 'cleanup', 'bench', or 'ladder'

  if (!command || !['seed', 'cleanup', 'bench', 'ladder'].includes(command)) {
    console.error('Usage: index.ts <seed|cleanup|bench|ladder> --seed=<number> [options]');
    process.exit(1);
  }

  // Parse --seed and --orgSlug from remaining args
  const seedArg = args.find((a) => a.startsWith('--seed='));
  if (!seedArg) {
    console.error('--seed=<number> is required');
    process.exit(1);
  }
  const seed = parseInt(seedArg.replace('--seed=', ''), 10);
  const orgSlugArg = args.find((a) => a.startsWith('--orgSlug='));
  const orgSlug = orgSlugArg ? orgSlugArg.replace('--orgSlug=', '') : 'scale-seed';
  const logSql = args.includes('--logSql=true');

  const ds = createDataSource(logSql);
  await ds.initialize();
  console.log('Database connection established');

  try {
    switch (command) {
      case 'seed': {
        const cfg = parseConfig(args);
        await runSeed(ds, cfg);
        break;
      }
      case 'cleanup': {
        await runCleanup(ds, { seed, orgSlug });
        break;
      }
      case 'bench': {
        const benchCfg = parseBenchConfig(args);
        await runBench(ds, benchCfg, args);
        break;
      }
      case 'ladder': {
        await runLadder(ds, args);
        break;
      }
    }
  } finally {
    if (ds.isInitialized) {
      await ds.destroy();
      console.log('Database connection closed');
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
