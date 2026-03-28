/**
 * Generator 12: Audit events.
 * Append-only. Spread across entity types and actions.
 * Minimal payloads for speed.
 * Adapts to actual audit_events column names.
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import { stableId, batchInsert, fmtTs, seededRng, getTableColumns } from '../scale-seed.utils';
import { workspaceId } from './workspaces.generator';
import { userId } from './users.generator';
import { projectId } from './projects.generator';

const ENTITY_TYPES = [
  'project', 'work_task', 'attachment', 'workspace',
  'portfolio', 'baseline', 'capacity_calendar', 'board_move',
];

const ACTIONS = [
  'create', 'update', 'delete', 'activate',
  'attach', 'detach', 'upload_complete', 'role_change',
];

const PLATFORM_ROLES = ['admin', 'pm', 'pm', 'pm', 'viewer'];

export async function generateAudit(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
  orgIdVal: string,
  log: (msg: string) => void,
): Promise<{ count: number }> {
  const rng = seededRng(cfg.seed + 12);
  const auditCols = await getTableColumns(ds, 'audit_events');

  // Detect column naming conventions
  const hasActorPlatformRole = auditCols.has('actor_platform_role');
  const hasMetadataJson = auditCols.has('metadata_json');
  const hasMetadata = auditCols.has('metadata');
  const hasActorUserId = auditCols.has('actor_user_id');
  const hasUserId = auditCols.has('user_id');
  const hasIpAddress = auditCols.has('ip_address');
  const hasIp = auditCols.has('ip');
  const hasProjectId = auditCols.has('project_id');

  // Build column list based on what exists
  const cols: string[] = ['id', 'organization_id', 'workspace_id'];
  if (hasActorUserId) cols.push('actor_user_id');
  else if (hasUserId) cols.push('user_id');
  if (hasActorPlatformRole) cols.push('actor_platform_role');
  cols.push('entity_type', 'entity_id', 'action');
  if (hasProjectId) cols.push('project_id');
  if (hasMetadataJson) cols.push('metadata_json');
  else if (hasMetadata) cols.push('metadata');
  cols.push('created_at');

  let rows: any[][] = [];
  let count = 0;

  // Spread events across a 90-day window
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 90);

  for (let i = 0; i < cfg.auditCount; i++) {
    const wsIdx = i % cfg.workspaceCount;
    const userIdx = i % cfg.userCount;
    const entityType = ENTITY_TYPES[i % ENTITY_TYPES.length];
    const action = ACTIONS[i % ACTIONS.length];
    const role = PLATFORM_ROLES[i % PLATFORM_ROLES.length];
    const entityId = projectId(cfg, i % cfg.projectCount);

    // Spread created_at across 90 days
    const createdAt = new Date(baseDate);
    createdAt.setSeconds(createdAt.getSeconds() + Math.floor((i / cfg.auditCount) * 90 * 86400));

    // Minimal metadata — small JSON
    const metadata = JSON.stringify({ seq: i, src: 'scale-seed' });

    const row: any[] = [
      stableId('audit', `${cfg.seed}:${i}`),
      orgIdVal,
      workspaceId(cfg, wsIdx),
    ];
    if (hasActorUserId) row.push(userId(cfg, userIdx));
    else if (hasUserId) row.push(userId(cfg, userIdx));
    if (hasActorPlatformRole) row.push(role);
    row.push(entityType, entityId, action);
    if (hasProjectId) row.push(entityId); // re-use entity as project
    if (hasMetadataJson || hasMetadata) row.push(metadata);
    row.push(fmtTs(createdAt));

    rows.push(row);
    count++;

    if (rows.length >= cfg.batch) {
      await batchInsert(ds, 'audit_events', cols, rows, cfg.batch, 'id', log);
      rows = [];
    }
  }

  if (rows.length > 0) {
    await batchInsert(ds, 'audit_events', cols, rows, cfg.batch, 'id', log);
  }

  return { count };
}
