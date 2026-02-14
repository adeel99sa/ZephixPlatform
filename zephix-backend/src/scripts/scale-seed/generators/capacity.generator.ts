/**
 * Generator 10: Workspace member capacity.
 * For all users × days: weekdays=8h, weekends=0, 5% random PTO=0.
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import {
  stableId, batchInsert, fmtTs, fmtDate,
  isWeekday, seededRng,
} from '../scale-seed.utils';
import { workspaceId } from './workspaces.generator';
import { userId } from './users.generator';

export async function generateCapacity(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
  orgIdVal: string,
  log: (msg: string) => void,
): Promise<{ count: number }> {
  const rng = seededRng(cfg.seed + 10);
  const now = fmtTs(new Date());

  const cols = [
    'id', 'organization_id', 'workspace_id', 'user_id',
    'date', 'capacity_hours', 'created_at', 'updated_at',
  ];

  let rows: any[][] = [];
  let count = 0;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Math.floor(cfg.days / 2));

  for (let u = 0; u < cfg.userCount; u++) {
    // Assign user to their "primary" workspace (round-robin)
    const wsIdx = u % cfg.workspaceCount;
    const wsId = workspaceId(cfg, wsIdx);
    const uid = userId(cfg, u);

    for (let d = 0; d < cfg.days; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);

      let hours = 0;
      if (isWeekday(date)) {
        hours = rng() < 0.05 ? 0 : 8; // 5% PTO
      }

      rows.push([
        stableId('capacity', `${cfg.seed}:${wsId}:${uid}:${fmtDate(date)}`),
        orgIdVal,
        wsId,
        uid,
        fmtDate(date),
        hours,
        now,
        now,
      ]);
      count++;

      if (rows.length >= cfg.batch) {
        await batchInsert(
          ds, 'workspace_member_capacity', cols, rows,
          cfg.batch, ['organization_id', 'workspace_id', 'user_id', 'date'], log,
        );
        rows = [];
      }
    }
  }

  if (rows.length > 0) {
    await batchInsert(
      ds, 'workspace_member_capacity', cols, rows,
      cfg.batch, ['organization_id', 'workspace_id', 'user_id', 'date'], log,
    );
  }

  return { count };
}
