/**
 * Generator 4: Workspace memberships.
 * Each workspace gets 1 owner, 3 admins, ~30 members, ~10 viewers (scaled).
 * Users are assigned round-robin.
 * Adapts to organization_id column presence.
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import { stableId, batchInsert, fmtTs, getTableColumns } from '../scale-seed.utils';
import { workspaceId } from './workspaces.generator';
import { userId } from './users.generator';
import { orgId } from './org.generator';

export async function generateWorkspaceMembers(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
  log: (msg: string) => void,
): Promise<{ count: number }> {
  const now = fmtTs(new Date());
  const wmCols = await getTableColumns(ds, 'workspace_members');
  const hasOrgId = wmCols.has('organization_id');
  const orgIdVal = orgId(cfg);

  // Target members per workspace: 1 owner + 3 admins + 30 members + 10 viewers = 44
  // Scale down if not enough users
  const perWs = Math.min(44, cfg.userCount);
  const ownerCount = 1;
  const adminCount = Math.min(3, Math.max(0, perWs - 1));
  const viewerCount = Math.min(10, Math.max(0, perWs - ownerCount - adminCount));
  const memberCount = Math.max(0, perWs - ownerCount - adminCount - viewerCount);

  const baseCols = [
    'id', 'workspace_id', 'user_id', 'role',
    'status', 'created_at', 'updated_at',
  ];
  const cols = hasOrgId ? [...baseCols, 'organization_id'] : baseCols;
  const rows: any[][] = [];

  for (let w = 0; w < cfg.workspaceCount; w++) {
    const wsId = workspaceId(cfg, w);
    let userIdx = w * perWs; // stagger starting user per workspace

    const addMember = (role: string): void => {
      const uIdx = userIdx % cfg.userCount;
      const row = [
        stableId('wsmember', `${cfg.seed}:${wsId}:${userId(cfg, uIdx)}`),
        wsId,
        userId(cfg, uIdx),
        role,
        'active',
        now,
        now,
      ];
      if (hasOrgId) row.push(orgIdVal);
      rows.push(row);
      userIdx++;
    };

    for (let i = 0; i < ownerCount; i++) addMember('workspace_owner');
    for (let i = 0; i < adminCount; i++) addMember('delivery_owner');
    for (let i = 0; i < memberCount; i++) addMember('workspace_member');
    for (let i = 0; i < viewerCount; i++) addMember('workspace_viewer');
  }

  await batchInsert(
    ds, 'workspace_members', cols, rows, cfg.batch,
    ['workspace_id', 'user_id'], log,
  );
  return { count: rows.length };
}
