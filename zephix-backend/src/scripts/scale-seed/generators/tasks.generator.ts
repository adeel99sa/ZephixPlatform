/**
 * Generator 6: Work tasks.
 * Distributed across projects with status, dates, priority, rank.
 * Adapts to available columns (planned_start_at, estimate_hours may not exist).
 *
 * Status distribution: BACKLOG 15%, TODO 25%, IN_PROGRESS 30%, IN_REVIEW 10%, DONE 20%.
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import {
  stableId, batchInsert, fmtTs, seededRng,
  addBusinessDays, pickFromDistribution, DistributionEntry,
  getTableColumns,
} from '../scale-seed.utils';
import { projectId, projectWorkspaceIndex } from './projects.generator';
import { workspaceId } from './workspaces.generator';
import { userId } from './users.generator';

const STATUS_DIST: DistributionEntry<string>[] = [
  { value: 'BACKLOG', pct: 15 },
  { value: 'TODO', pct: 25 },
  { value: 'IN_PROGRESS', pct: 30 },
  { value: 'IN_REVIEW', pct: 10 },
  { value: 'DONE', pct: 20 },
];

const PRIORITY_DIST: DistributionEntry<string>[] = [
  { value: 'LOW', pct: 20 },
  { value: 'MEDIUM', pct: 50 },
  { value: 'HIGH', pct: 25 },
  { value: 'CRITICAL', pct: 5 },
];

export function taskId(cfg: ScaleSeedConfig, projectIdx: number, taskLocalIdx: number): string {
  return stableId('task', `${cfg.seed}:${projectId(cfg, projectIdx)}:${taskLocalIdx}`);
}

export async function generateTasks(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
  orgIdVal: string,
  evProjectIndices: number[],
  log: (msg: string) => void,
): Promise<{
  count: number;
  tasksByProject: Map<number, number>;
}> {
  const now = fmtTs(new Date());
  const rng = seededRng(cfg.seed + 6);
  const evSet = new Set(evProjectIndices);
  const taskCols = await getTableColumns(ds, 'work_tasks');

  // Detect which columns exist
  const hasPlannedStart = taskCols.has('planned_start_at');
  const hasPlannedEnd = taskCols.has('planned_end_at');
  const hasPctComplete = taskCols.has('percent_complete');
  const hasIsMilestone = taskCols.has('is_milestone');
  const hasEstHours = taskCols.has('estimate_hours');
  const hasRemHours = taskCols.has('remaining_hours');
  const hasActHours = taskCols.has('actual_hours');
  const hasStoryPoints = taskCols.has('story_points');
  const hasEstPoints = taskCols.has('estimate_points');

  // Distribute tasks across projects
  const tasksPerProject = Math.max(1, Math.floor(cfg.taskCount / cfg.projectCount));
  const tasksByProject = new Map<number, number>();

  // Build column list based on what exists
  const cols: string[] = [
    'id', 'organization_id', 'workspace_id', 'project_id',
    'title', 'status', 'type', 'priority',
    'assignee_user_id',
  ];
  if (hasPlannedStart) cols.push('planned_start_at');
  if (hasPlannedEnd) cols.push('planned_end_at');
  // Always use start_date/due_date as fallback (these exist in base schema)
  if (!hasPlannedStart && taskCols.has('start_date')) cols.push('start_date');
  if (!hasPlannedEnd && taskCols.has('due_date')) cols.push('due_date');
  if (hasPctComplete) cols.push('percent_complete');
  if (hasIsMilestone) cols.push('is_milestone');
  if (hasEstHours) cols.push('estimate_hours');
  if (hasRemHours) cols.push('remaining_hours');
  if (hasActHours) cols.push('actual_hours');
  if (hasStoryPoints) cols.push('story_points');
  if (hasEstPoints) cols.push('estimate_points');
  cols.push('rank', 'created_at', 'updated_at');

  let totalTasks = 0;
  let batchRows: any[][] = [];

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 30);

  for (let pIdx = 0; pIdx < cfg.projectCount; pIdx++) {
    const count = Math.min(
      tasksPerProject,
      cfg.taskCount - totalTasks,
    );
    if (count <= 0) break;
    tasksByProject.set(pIdx, count);

    const wsIdx = projectWorkspaceIndex(cfg, pIdx);
    const wsId = workspaceId(cfg, wsIdx);
    const pId = projectId(cfg, pIdx);
    const isEv = evSet.has(pIdx);

    // Stagger project start: some past, some future
    const projStart = new Date(baseDate);
    projStart.setDate(projStart.getDate() + (pIdx % 60) - 30);

    for (let t = 0; t < count; t++) {
      const tId = taskId(cfg, pIdx, t);
      const status = pickFromDistribution(t, count, STATUS_DIST);
      const priority = pickFromDistribution(t, count, PRIORITY_DIST);
      const assigneeIdx = (pIdx * 7 + t) % cfg.userCount;

      // Dates: spread tasks across the project window
      const offsetDays = Math.floor(rng() * 60);
      const durationDays = 1 + Math.floor(rng() * 9); // 1-10 business days
      const start = addBusinessDays(projStart, offsetDays);
      const end = addBusinessDays(start, durationDays);

      const estHours = 2 + Math.floor(rng() * 38); // 2-40h
      let pctComplete = 0;
      let actualHours: number | null = null;
      let remainingHours: number | null = estHours;

      if (status === 'DONE') {
        pctComplete = 100;
        actualHours = isEv ? Math.round(estHours * (0.8 + rng() * 0.4)) : estHours;
        remainingHours = 0;
      } else if (status === 'IN_PROGRESS' || status === 'IN_REVIEW') {
        pctComplete = 10 + Math.floor(rng() * 80);
        if (isEv) {
          actualHours = Math.round(estHours * (pctComplete / 100) * (0.9 + rng() * 0.2));
        }
        remainingHours = Math.max(0, estHours - (actualHours ?? 0));
      }

      const isMilestone = t % 25 === 0; // ~4% milestones

      const row: any[] = [
        tId, orgIdVal, wsId, pId,
        `Task ${pIdx}-${t}`,
        status, isMilestone ? 'MILESTONE' : 'TASK', priority,
        userId(cfg, assigneeIdx),
      ];
      if (hasPlannedStart) row.push(fmtTs(start));
      if (hasPlannedEnd) row.push(fmtTs(end));
      if (!hasPlannedStart && taskCols.has('start_date')) row.push(fmtTs(start));
      if (!hasPlannedEnd && taskCols.has('due_date')) row.push(fmtTs(end));
      if (hasPctComplete) row.push(pctComplete);
      if (hasIsMilestone) row.push(isMilestone);
      // CHECK constraints: estimate_hours and estimate_points must be NULL or > 0
      if (hasEstHours) row.push(isMilestone ? null : estHours);
      if (hasRemHours) row.push(isMilestone ? null : remainingHours);
      if (hasActHours) row.push(actualHours);
      if (hasStoryPoints) row.push(isMilestone ? null : Math.ceil(estHours / 4));
      if (hasEstPoints) row.push(isMilestone ? null : Math.ceil(estHours / 4));
      row.push(t); // rank = task index
      row.push(now, now);

      batchRows.push(row);
      totalTasks++;

      if (batchRows.length >= cfg.batch) {
        await batchInsert(ds, 'work_tasks', cols, batchRows, cfg.batch, 'id', log);
        batchRows = [];
      }
    }
  }

  if (batchRows.length > 0) {
    await batchInsert(ds, 'work_tasks', cols, batchRows, cfg.batch, 'id', log);
  }

  return { count: totalTasks, tasksByProject };
}
