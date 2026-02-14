/**
 * Phase 5A: Cleanup runner.
 * Deletes all data for a seed org, in reverse FK order.
 * Identifies org by slug + settings.scaleSeed.seed (or plan_metadata.scaleSeed.seed).
 * Skips tables that don't exist.
 * Writes a zero-residue proof file after cleanup.
 */
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { tableExists } from '../scale-seed.utils';

export interface CleanupConfig {
  seed: number;
  orgSlug: string;
}

/**
 * Determine whether the residue check has any unverified or non-zero entries.
 * QUERY_FAILED counts as residue — we cannot prove zero if a query failed.
 * TABLE_NOT_FOUND is acceptable (table doesn't exist, nothing to leak).
 */
export function computeHasResidue(residue: Record<string, number | string>): boolean {
  for (const value of Object.values(residue)) {
    if (value === 'QUERY_FAILED') return true;
    if (typeof value === 'number' && value > 0) return true;
  }
  return false;
}

const DELETE_ORDER = [
  'audit_events',
  'workspace_storage_usage',
  'attachments',
  'workspace_member_capacity',
  'earned_value_snapshots',
  'schedule_baseline_items',
  'schedule_baselines',
  'work_task_dependencies',
  'work_tasks',
  'projects',
  'workspace_members',
  'workspaces',
  'user_organizations',
  'users',
];

export async function runCleanup(ds: DataSource, config: CleanupConfig): Promise<void> {
  const log = (msg: string): void => console.log(`[cleanup] ${msg}`);

  // Find the seed org (try both settings and plan_metadata for compatibility)
  let orgRows = await ds.query(
    `SELECT id FROM organizations WHERE slug = $1 AND settings->>'scaleSeed' IS NOT NULL`,
    [config.orgSlug],
  );

  // Fallback: check plan_metadata if settings didn't match
  if (orgRows.length === 0) {
    orgRows = await ds.query(
      `SELECT id FROM organizations WHERE slug = $1 AND plan_metadata->'scaleSeed'->>'seed' = $2`,
      [config.orgSlug, String(config.seed)],
    );
  }

  if (orgRows.length === 0) {
    log(`No organization found for slug=${config.orgSlug} seed=${config.seed}`);
    return;
  }

  const orgId = orgRows[0].id;
  log(`Found org ${orgId} for slug=${config.orgSlug} seed=${config.seed}`);

  const counts: Record<string, number> = {};

  for (const table of DELETE_ORDER) {
    // Skip tables that don't exist
    const exists = await tableExists(ds, table);
    if (!exists) {
      log(`  ${table}: SKIP (table not in DB)`);
      continue;
    }

    try {
      // Most tables have organization_id; some have it through joins
      if (table === 'schedule_baseline_items') {
        const result = await ds.query(
          `DELETE FROM schedule_baseline_items WHERE baseline_id IN (
            SELECT id FROM schedule_baselines WHERE organization_id = $1
          )`,
          [orgId],
        );
        counts[table] = result[1] ?? 0;
      } else if (table === 'users') {
        const result = await ds.query(
          `DELETE FROM users WHERE organization_id = $1`,
          [orgId],
        );
        counts[table] = result[1] ?? 0;
      } else {
        const result = await ds.query(
          `DELETE FROM ${table} WHERE organization_id = $1`,
          [orgId],
        );
        counts[table] = result[1] ?? 0;
      }
      log(`  ${table}: ${counts[table]} rows deleted`);
    } catch (err) {
      log(`  ${table}: SKIP (${(err as Error).message.slice(0, 80)})`);
      counts[table] = 0;
    }
  }

  // Finally delete the org
  await ds.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
  counts.organizations = 1;
  log(`  organizations: 1 row deleted`);

  log('\nCleanup complete. Summary:');
  let total = 0;
  for (const [table, count] of Object.entries(counts)) {
    if (count > 0) {
      log(`  ${table}: ${count.toLocaleString()}`);
      total += count;
    }
  }
  log(`  TOTAL: ${total.toLocaleString()} rows deleted`);

  // ─── Zero-residue proof ───────────────────────────────────
  log('\nZero-residue verification:');
  const ALL_TABLES = [
    ...DELETE_ORDER,
    'organizations',
  ];
  const residue: Record<string, number | string> = {};

  for (const table of ALL_TABLES) {
    const exists = await tableExists(ds, table);
    if (!exists) {
      residue[table] = 'TABLE_NOT_FOUND';
      continue;
    }
    try {
      let remaining: number;
      if (table === 'organizations') {
        // organizations uses "id", not "organization_id"
        const rows = await ds.query(
          `SELECT COUNT(*)::int AS c FROM organizations WHERE id = $1`,
          [orgId],
        );
        remaining = rows[0]?.c ?? 0;
      } else if (table === 'schedule_baseline_items') {
        // schedule_baseline_items has no organization_id — check via baseline FK
        const rows = await ds.query(
          `SELECT COUNT(*)::int AS c FROM schedule_baseline_items WHERE baseline_id IN (
            SELECT id FROM schedule_baselines WHERE organization_id = $1
          )`,
          [orgId],
        );
        remaining = rows[0]?.c ?? 0;
      } else {
        const rows = await ds.query(
          `SELECT COUNT(*)::int AS c FROM ${table} WHERE organization_id = $1`,
          [orgId],
        );
        remaining = rows[0]?.c ?? 0;
      }
      residue[table] = remaining;
      if (remaining > 0) {
        log(`  WARNING: ${table} has ${remaining} residual rows!`);
      } else {
        log(`  ${table}: 0 rows (clean)`);
      }
    } catch (err) {
      residue[table] = 'QUERY_FAILED';
      log(`  ${table}: QUERY_FAILED (${(err as Error).message.slice(0, 80)})`);
    }
  }

  const hasResidue = computeHasResidue(residue);

  // Write cleanup proof file
  const proofDir = path.resolve(
    __dirname,
    '../../../../../docs/architecture/proofs/phase5a',
  );
  if (!fs.existsSync(proofDir)) {
    fs.mkdirSync(proofDir, { recursive: true });
  }
  const proofData = {
    action: 'cleanup_zero_residue_proof',
    orgId,
    seed: config.seed,
    orgSlug: config.orgSlug,
    cleanedAt: new Date().toISOString(),
    rowsDeleted: counts,
    totalDeleted: total,
    residueCheck: residue,
    hasResidue,
  };
  fs.writeFileSync(
    path.join(proofDir, `cleanup-proof-seed-${config.seed}.json`),
    JSON.stringify(proofData, null, 2) + '\n',
  );
  log(`\nCleanup proof written to docs/architecture/proofs/phase5a/cleanup-proof-seed-${config.seed}.json`);
  if (hasResidue) {
    log('WARNING: Residual rows detected after cleanup. See proof file.');
  } else {
    log('VERIFIED: Zero residue. All seed data removed.');
  }
}
