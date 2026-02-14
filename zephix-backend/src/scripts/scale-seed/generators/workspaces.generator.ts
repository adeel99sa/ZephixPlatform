/**
 * Generator 2: Workspaces.
 * Creates scaled workspace count, evenly spread across the org.
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import { stableId, batchInsert, fmtTs } from '../scale-seed.utils';
import { userId } from './users.generator';

export function workspaceId(cfg: ScaleSeedConfig, index: number): string {
  return stableId('workspace', `${cfg.seed}:${cfg.orgSlug}:${index}`);
}

export async function generateWorkspaces(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
  orgIdVal: string,
  log: (msg: string) => void,
): Promise<{ count: number }> {
  const now = fmtTs(new Date());
  const creatorId = userId(cfg, 0); // first user is creator

  const cols = [
    'id', 'organization_id', 'name', 'slug',
    'created_by', 'owner_id', 'created_at', 'updated_at',
  ];
  const rows: any[][] = [];

  for (let i = 0; i < cfg.workspaceCount; i++) {
    const idx = String(i).padStart(4, '0');
    rows.push([
      workspaceId(cfg, i),
      orgIdVal,
      `Workspace ${idx}`,
      `ws-${cfg.orgSlug}-${idx}`,
      creatorId,
      creatorId,
      now,
      now,
    ]);
  }

  await batchInsert(ds, 'workspaces', cols, rows, cfg.batch, 'id', log);
  return { count: cfg.workspaceCount };
}
