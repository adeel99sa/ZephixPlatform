/**
 * Generator 8: Schedule baselines + baseline items.
 * For 200 scaled projects, create 1 baseline each with items for all tasks.
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import {
  stableId, batchInsert, fmtTs, scaleCount,
} from '../scale-seed.utils';
import { projectId, projectWorkspaceIndex } from './projects.generator';
import { workspaceId } from './workspaces.generator';
import { taskId } from './tasks.generator';
import { userId } from './users.generator';

export function baselineId(cfg: ScaleSeedConfig, projectIdx: number): string {
  return stableId('baseline', `${cfg.seed}:${projectId(cfg, projectIdx)}:0`);
}

export async function generateBaselines(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
  orgIdVal: string,
  evProjectIndices: number[],
  tasksByProject: Map<number, number>,
  log: (msg: string) => void,
): Promise<{ baselineCount: number; itemCount: number }> {
  const now = fmtTs(new Date());
  const creatorId = userId(cfg, 0);
  const maxBaselines = scaleCount(200, cfg.scale);
  const projectsToBaseline = evProjectIndices.slice(0, maxBaselines);

  // ─── schedule_baselines ─────────────────────────────────
  const blCols = [
    'id', 'organization_id', 'workspace_id', 'project_id',
    'name', 'created_by', 'locked', 'is_active', 'created_at',
  ];
  const blRows: any[][] = [];

  for (const pIdx of projectsToBaseline) {
    const wsIdx = projectWorkspaceIndex(cfg, pIdx);
    blRows.push([
      baselineId(cfg, pIdx),
      orgIdVal,
      workspaceId(cfg, wsIdx),
      projectId(cfg, pIdx),
      `Baseline 1 (seed ${cfg.seed})`,
      creatorId,
      true,
      true, // active
      now,
    ]);
  }

  await batchInsert(ds, 'schedule_baselines', blCols, blRows, cfg.batch, 'id', log);

  // ─── schedule_baseline_items ────────────────────────────
  const itemCols = [
    'id', 'baseline_id', 'task_id',
    'planned_start_at', 'planned_end_at',
    'duration_minutes', 'critical_path', 'total_float_minutes',
    'captured_at',
  ];
  let itemRows: any[][] = [];
  let itemCount = 0;

  for (const pIdx of projectsToBaseline) {
    const blId = baselineId(cfg, pIdx);
    const taskCount = tasksByProject.get(pIdx) ?? 0;

    for (let t = 0; t < taskCount; t++) {
      const tId = taskId(cfg, pIdx, t);
      const start = new Date();
      start.setDate(start.getDate() - 30 + (t % 60));
      const dur = (1 + (t % 10)) * 480; // 1-10 business days in minutes
      const end = new Date(start.getTime() + dur * 60000);
      const isCritical = t % 5 === 0;

      itemRows.push([
        stableId('blitem', `${cfg.seed}:${blId}:${tId}`),
        blId,
        tId,
        fmtTs(start),
        fmtTs(end),
        dur,
        isCritical,
        isCritical ? 0 : (t % 3 + 1) * 480,
        now,
      ]);
      itemCount++;

      if (itemRows.length >= cfg.batch) {
        await batchInsert(
          ds, 'schedule_baseline_items', itemCols, itemRows,
          cfg.batch, ['baseline_id', 'task_id'], log,
        );
        itemRows = [];
      }
    }
  }

  if (itemRows.length > 0) {
    await batchInsert(
      ds, 'schedule_baseline_items', itemCols, itemRows,
      cfg.batch, ['baseline_id', 'task_id'], log,
    );
  }

  return { baselineCount: blRows.length, itemCount };
}
