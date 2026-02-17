/**
 * KPI Snapshots Cleanup Script
 *
 * Retention policy:
 *   - portfolio_kpi_snapshots: keep 180 days
 *   - program_kpi_snapshots:   keep 180 days
 *
 * Usage:
 *   KPI_SNAPSHOTS_DRY_RUN=true npx ts-node src/scripts/kpi-snapshots-cleanup.ts
 *   npx ts-node src/scripts/kpi-snapshots-cleanup.ts
 *
 * NOT scheduled in MVP. Run manually or via external cron.
 */

import { DataSource } from 'typeorm';

const DRY_RUN = process.env.KPI_SNAPSHOTS_DRY_RUN === 'true';

const RETENTION_DAYS = parseInt(
  process.env.KPI_SNAPSHOT_RETENTION_DAYS || '180',
  10,
);

const TABLES = [
  'portfolio_kpi_snapshots',
  'program_kpi_snapshots',
] as const;

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set. Exiting.');
    process.exit(1);
  }

  const ds = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

  await ds.initialize();
  console.log('Connected to database.');
  console.log(
    `Retention: ${RETENTION_DAYS} days | Dry run: ${DRY_RUN}`,
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffIso = cutoff.toISOString();

  try {
    for (const table of TABLES) {
      const exists = await ds.query(
        `SELECT to_regclass($1) IS NOT NULL AS exists`,
        [table],
      );
      if (!exists[0]?.exists) {
        console.log(`Table ${table} does not exist — skipping.`);
        continue;
      }

      const countResult = await ds.query(
        `SELECT count(*) AS cnt FROM ${table} WHERE computed_at < $1`,
        [cutoffIso],
      );
      const count = parseInt(countResult[0]?.cnt ?? '0', 10);
      console.log(
        `${table}: ${count} rows older than ${RETENTION_DAYS} days`,
      );

      if (DRY_RUN || count === 0) {
        continue;
      }

      const deleteResult = await ds.query(
        `DELETE FROM ${table} WHERE computed_at < $1`,
        [cutoffIso],
      );
      console.log(`${table}: deleted ${deleteResult[1] ?? 0} rows.`);
    }

    if (DRY_RUN) {
      console.log('DRY RUN — no rows deleted.');
    } else {
      console.log('Cleanup complete.');
    }
  } finally {
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error('KPI snapshots cleanup failed:', err);
  process.exit(1);
});
