/**
 * Generator 7: Task dependencies.
 * DAG per project — chain + parallel patterns, no cycles.
 *
 * Type distribution: FS 70%, SS 15%, FF 10%, SF 5%.
 * 20% have lag_minutes set (if column exists).
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import {
  stableId, batchInsert, fmtTs, seededRng,
  pickFromDistribution, DistributionEntry, getTableColumns,
} from '../scale-seed.utils';
import { projectId, projectWorkspaceIndex } from './projects.generator';
import { workspaceId } from './workspaces.generator';
import { taskId } from './tasks.generator';
import { userId } from './users.generator';

const DEP_TYPE_DIST: DistributionEntry<string>[] = [
  { value: 'FINISH_TO_START', pct: 70 },
  { value: 'START_TO_START', pct: 15 },
  { value: 'FINISH_TO_FINISH', pct: 10 },
  { value: 'START_TO_FINISH', pct: 5 },
];

/**
 * Generates dependencies as a DAG per project.
 *
 * Strategy: for each project, create chain deps (task[i] → task[i+1])
 * and some parallel deps (task[i] → task[i+2], task[i] → task[i+3]).
 * Only goes forward in index, guaranteeing no cycles.
 */
export async function generateDependencies(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
  orgIdVal: string,
  tasksByProject: Map<number, number>,
  log: (msg: string) => void,
): Promise<{ count: number }> {
  const now = fmtTs(new Date());
  const rng = seededRng(cfg.seed + 7);
  const creatorId = userId(cfg, 0);
  const depCols = await getTableColumns(ds, 'work_task_dependencies');
  const hasLag = depCols.has('lag_minutes');

  const baseCols = [
    'id', 'organization_id', 'workspace_id', 'project_id',
    'predecessor_task_id', 'successor_task_id',
    'type', 'created_by_user_id', 'created_at',
  ];
  const cols = hasLag
    ? [...baseCols.slice(0, 7), 'lag_minutes', ...baseCols.slice(7)]
    : baseCols;

  let totalDeps = 0;
  let batchRows: any[][] = [];
  const targetDeps = cfg.depCount;

  // Distribute deps proportionally across projects
  const totalTasks = Array.from(tasksByProject.values()).reduce((s, c) => s + c, 0);

  for (const [pIdx, taskCount] of tasksByProject) {
    if (totalDeps >= targetDeps) break;
    if (taskCount < 2) continue;

    const wsIdx = projectWorkspaceIndex(cfg, pIdx);
    const wsId = workspaceId(cfg, wsIdx);
    const pId = projectId(cfg, pIdx);

    // Target deps for this project proportional to its task share
    const projTarget = Math.min(
      Math.floor((taskCount / totalTasks) * targetDeps),
      targetDeps - totalDeps,
    );

    let projDeps = 0;
    const seen = new Set<string>();

    const addDep = (fromIdx: number, toIdx: number): void => {
      const from = taskId(cfg, pIdx, fromIdx);
      const to = taskId(cfg, pIdx, toIdx);
      const key = `${from}:${to}`;
      if (seen.has(key)) return;
      seen.add(key);

      const depType = pickFromDistribution(projDeps, projTarget, DEP_TYPE_DIST);
      const lag = rng() < 0.2 ? Math.floor(rng() * 480) : 0;

      const row: any[] = [
        stableId('dep', `${cfg.seed}:${pId}:${from}:${to}:${depType}:${lag}`),
        orgIdVal, wsId, pId,
        from, to,
        depType,
      ];
      if (hasLag) row.push(lag);
      row.push(creatorId, now);

      batchRows.push(row);
      projDeps++;
      totalDeps++;
    };

    // Chain: task[i] → task[i+1]
    for (let t = 0; t < taskCount - 1 && projDeps < projTarget; t++) {
      addDep(t, t + 1);
      if (batchRows.length >= cfg.batch) {
        await batchInsert(ds, 'work_task_dependencies', cols, batchRows, cfg.batch, 'id', log);
        batchRows = [];
      }
    }

    // Parallel: task[i] → task[i+2] (skip deps)
    for (let t = 0; t < taskCount - 2 && projDeps < projTarget; t += 2) {
      const skip = t + 2 < taskCount ? 2 : 1;
      addDep(t, t + skip);
      if (batchRows.length >= cfg.batch) {
        await batchInsert(ds, 'work_task_dependencies', cols, batchRows, cfg.batch, 'id', log);
        batchRows = [];
      }
    }
  }

  if (batchRows.length > 0) {
    await batchInsert(ds, 'work_task_dependencies', cols, batchRows, cfg.batch, 'id', log);
  }

  return { count: totalDeps };
}
