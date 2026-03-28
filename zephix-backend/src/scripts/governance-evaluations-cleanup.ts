/**
 * Governance Evaluations Cleanup Script
 *
 * Retention policy:
 *   - BLOCK & OVERRIDE: keep 12 months
 *   - WARN & ALLOW:     keep 90 days
 *
 * Usage:
 *   GOVERNANCE_CLEANUP_DRY_RUN=true npx ts-node src/scripts/governance-evaluations-cleanup.ts
 *   npx ts-node src/scripts/governance-evaluations-cleanup.ts
 *
 * NOT scheduled in MVP. Run manually or via external cron.
 */

import { DataSource } from 'typeorm';

const DRY_RUN = process.env.GOVERNANCE_CLEANUP_DRY_RUN === 'true';

const WARN_ALLOW_RETENTION_DAYS = 90;
const BLOCK_OVERRIDE_RETENTION_DAYS = 365;

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

  try {
    // 1. Count WARN/ALLOW older than 90 days
    const warnAllowCutoff = new Date();
    warnAllowCutoff.setDate(warnAllowCutoff.getDate() - WARN_ALLOW_RETENTION_DAYS);

    const warnAllowCount = await ds.query(
      `SELECT count(*) as cnt FROM governance_evaluations
       WHERE decision IN ('WARN', 'ALLOW')
         AND created_at < $1`,
      [warnAllowCutoff.toISOString()],
    );
    console.log(
      `WARN/ALLOW older than ${WARN_ALLOW_RETENTION_DAYS} days: ${warnAllowCount[0]?.cnt ?? 0} rows`,
    );

    // 2. Count BLOCK/OVERRIDE older than 12 months
    const blockOverrideCutoff = new Date();
    blockOverrideCutoff.setDate(
      blockOverrideCutoff.getDate() - BLOCK_OVERRIDE_RETENTION_DAYS,
    );

    const blockOverrideCount = await ds.query(
      `SELECT count(*) as cnt FROM governance_evaluations
       WHERE decision IN ('BLOCK', 'OVERRIDE')
         AND created_at < $1`,
      [blockOverrideCutoff.toISOString()],
    );
    console.log(
      `BLOCK/OVERRIDE older than ${BLOCK_OVERRIDE_RETENTION_DAYS} days: ${blockOverrideCount[0]?.cnt ?? 0} rows`,
    );

    if (DRY_RUN) {
      console.log('DRY RUN — no rows deleted.');
      return;
    }

    // 3. Purge WARN/ALLOW
    const warnResult = await ds.query(
      `DELETE FROM governance_evaluations
       WHERE decision IN ('WARN', 'ALLOW')
         AND created_at < $1`,
      [warnAllowCutoff.toISOString()],
    );
    console.log(`Deleted ${warnResult[1] ?? 0} WARN/ALLOW rows.`);

    // 4. Purge BLOCK/OVERRIDE
    const blockResult = await ds.query(
      `DELETE FROM governance_evaluations
       WHERE decision IN ('BLOCK', 'OVERRIDE')
         AND created_at < $1`,
      [blockOverrideCutoff.toISOString()],
    );
    console.log(`Deleted ${blockResult[1] ?? 0} BLOCK/OVERRIDE rows.`);

    console.log('Cleanup complete.');
  } finally {
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
