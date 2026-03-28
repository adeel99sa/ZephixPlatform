/**
 * Generator 5: Projects.
 * Spread evenly across workspaces. Adapts to available columns.
 * If governance flag columns exist (waterfall_enabled, etc.), sets them.
 * Otherwise uses only base columns.
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import { stableId, batchInsert, fmtTs, seededRng, getTableColumns } from '../scale-seed.utils';
import { workspaceId } from './workspaces.generator';
import { userId } from './users.generator';

export function projectId(cfg: ScaleSeedConfig, index: number): string {
  const wsIdx = index % cfg.workspaceCount;
  return stableId('project', `${cfg.seed}:${workspaceId(cfg, wsIdx)}:${index}`);
}

export function projectWorkspaceIndex(cfg: ScaleSeedConfig, index: number): number {
  return index % cfg.workspaceCount;
}

export async function generateProjects(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
  orgIdVal: string,
  log: (msg: string) => void,
): Promise<{ count: number; evProjectIndices: number[]; capacityProjectIndices: number[] }> {
  const now = fmtTs(new Date());
  const rng = seededRng(cfg.seed + 5);
  const projCols = await getTableColumns(ds, 'projects');

  const statuses = ['planning', 'active', 'active', 'active', 'completed'];
  const priorities = ['low', 'medium', 'medium', 'high', 'critical'];

  // Detect which governance columns exist
  const hasWaterfall = projCols.has('waterfall_enabled');
  const hasBaselines = projCols.has('baselines_enabled');
  const hasEV = projCols.has('earned_value_enabled');
  const hasCapacity = projCols.has('capacity_enabled');
  const hasCapMode = projCols.has('capacity_mode');
  const hasCostTracking = projCols.has('cost_tracking_enabled');
  const hasMethodology = projCols.has('methodology');
  const hasState = projCols.has('state');
  const hasBudget = projCols.has('budget');

  // Build column list dynamically
  const cols: string[] = [
    'id', 'name', 'description', 'status', 'priority',
    'workspace_id', 'organization_id', 'project_manager_id',
    'created_at', 'updated_at',
  ];
  if (hasBudget) cols.push('budget');
  if (hasCostTracking) cols.push('cost_tracking_enabled');
  if (hasWaterfall) cols.push('waterfall_enabled');
  if (hasBaselines) cols.push('baselines_enabled');
  if (hasEV) cols.push('earned_value_enabled');
  if (hasCapacity) cols.push('capacity_enabled');
  if (hasCapMode) cols.push('capacity_mode');
  if (hasMethodology) cols.push('methodology');
  if (hasState) cols.push('state');

  const rows: any[][] = [];
  const evProjectIndices: number[] = [];
  const capacityProjectIndices: number[] = [];

  for (let i = 0; i < cfg.projectCount; i++) {
    const wsIdx = projectWorkspaceIndex(cfg, i);
    const wsId = workspaceId(cfg, wsIdx);
    const pmIdx = i % cfg.userCount;
    const idx = String(i).padStart(5, '0');

    const isEv = i < Math.floor(cfg.projectCount * 0.2); // first 20%
    const isCap = i >= Math.floor(cfg.projectCount * 0.2) &&
      i < Math.floor(cfg.projectCount * 0.5); // next 30%

    if (isEv && hasEV) evProjectIndices.push(i);
    if (isCap && hasCapacity) capacityProjectIndices.push(i);

    const budget = isEv ? Math.round(50000 + rng() * 450000) : null;

    const row: any[] = [
      projectId(cfg, i),
      `Project ${idx}`,
      `Scale seed project ${idx}`,
      statuses[i % statuses.length],
      priorities[i % priorities.length],
      wsId,
      orgIdVal,
      userId(cfg, pmIdx),
      now,
      now,
    ];
    if (hasBudget) row.push(budget);
    if (hasCostTracking) row.push(isEv);
    if (hasWaterfall) row.push(isEv || isCap);
    if (hasBaselines) row.push(isEv);
    if (hasEV) row.push(isEv);
    if (hasCapacity) row.push(isCap);
    if (hasCapMode) row.push(isCap ? 'both' : 'hours_only');
    if (hasMethodology) row.push(isEv ? 'waterfall' : 'agile');
    if (hasState) row.push(i % 3 === 0 ? 'COMPLETED' : 'ACTIVE');

    rows.push(row);
  }

  await batchInsert(ds, 'projects', cols, rows, cfg.batch, 'id', log);
  return { count: cfg.projectCount, evProjectIndices, capacityProjectIndices };
}
