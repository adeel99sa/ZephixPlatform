/**
 * Generator 1: Organization.
 * Creates one seed org with scaleSeed tag in settings.
 * Adapts to available columns (plan_code may not exist yet).
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import { stableId, fmtTs, getTableColumns } from '../scale-seed.utils';

export function orgId(cfg: ScaleSeedConfig): string {
  return stableId('org', `${cfg.seed}:${cfg.orgSlug}`);
}

export async function generateOrg(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
): Promise<{ orgId: string; count: number }> {
  const id = orgId(cfg);
  const now = fmtTs(new Date());
  const cols = await getTableColumns(ds, 'organizations');
  const seedMeta = JSON.stringify({ scaleSeed: { seed: cfg.seed, scale: cfg.scale } });

  // Build dynamic column list based on what the DB actually has
  const insertCols: string[] = ['id', 'name', 'slug', 'status', 'settings', 'created_at', 'updated_at'];
  const insertVals: any[] = [
    id,
    `Scale Seed Org (seed=${cfg.seed})`,
    cfg.orgSlug,
    'active',
    seedMeta, // store seed info in settings JSONB (always exists)
    now,
    now,
  ];

  // Phase 3A columns (may not exist if migrations haven't run)
  if (cols.has('plan_code')) {
    insertCols.push('plan_code');
    insertVals.push('enterprise');
  }
  if (cols.has('plan_status')) {
    insertCols.push('plan_status');
    insertVals.push('active');
  }
  if (cols.has('plan_metadata')) {
    insertCols.push('plan_metadata');
    insertVals.push(seedMeta);
  }

  const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(', ');

  await ds.query(
    `INSERT INTO organizations (${insertCols.join(', ')})
     VALUES (${placeholders})
     ON CONFLICT (slug) DO NOTHING`,
    insertVals,
  );

  return { orgId: id, count: 1 };
}
