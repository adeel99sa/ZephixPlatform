/**
 * Generator 3: Users + user_organizations.
 * Creates scaled user count with deterministic emails and role distribution.
 *
 * Platform roles via user_organizations:
 *   5% admin, 85% pm (MEMBER), 10% viewer
 *
 * Adapts to actual DB column names (user_organizations may use camelCase).
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import {
  stableId, batchInsert, fmtTs,
  pickFromDistribution, DistributionEntry,
  getTableColumns,
} from '../scale-seed.utils';

const PLATFORM_ROLE_DIST: DistributionEntry<string>[] = [
  { value: 'admin', pct: 5 },
  { value: 'pm', pct: 85 },
  { value: 'viewer', pct: 10 },
];

export function userId(cfg: ScaleSeedConfig, index: number): string {
  return stableId('user', `${cfg.seed}:${cfg.orgSlug}:${index}`);
}

export function userOrgId(cfg: ScaleSeedConfig, index: number): string {
  return stableId('userorg', `${cfg.seed}:${cfg.orgSlug}:${index}`);
}

export async function generateUsers(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
  orgIdVal: string,
  log: (msg: string) => void,
): Promise<{ count: number }> {
  const now = fmtTs(new Date());
  // A fixed bcrypt hash for "SeedPassword1!" — never used for real auth
  const passwordHash = '$2b$10$eCQbFKJGm.iwSxHmHVH.a.FAKESEEDDONTUSE000000000000';

  // ─── users rows ─────────────────────────────────────────
  const userCols = [
    'id', 'email', 'password', 'first_name', 'last_name',
    'is_active', 'role', 'organization_id',
    'created_at', 'updated_at', 'last_password_change',
  ];
  const userRows: any[][] = [];

  for (let i = 0; i < cfg.userCount; i++) {
    const uid = userId(cfg, i);
    const idx = String(i).padStart(5, '0');
    userRows.push([
      uid,
      `user${idx}+seed${cfg.seed}@zephix.local`,
      passwordHash,
      `Seed`,
      `User${idx}`,
      true,
      'user',
      orgIdVal,
      now,
      now,
      now,
    ]);
  }

  await batchInsert(ds, 'users', userCols, userRows, cfg.batch, 'id', log);

  // ─── user_organizations rows ────────────────────────────
  // This table may have both camelCase AND snake_case columns (migration artifacts).
  // We must populate all NOT NULL columns.
  const uoCols = await getTableColumns(ds, 'user_organizations');

  // Build column list — include both camelCase and snake_case where they exist
  const uoColNames: string[] = ['id'];
  const hasCamelUserId = uoCols.has('userId');
  const hasSnakeUserId = uoCols.has('user_id');
  const hasCamelOrgId = uoCols.has('organizationId');
  const hasSnakeOrgId = uoCols.has('organization_id');
  const hasCamelActive = uoCols.has('isActive');
  const hasSnakeActive = uoCols.has('is_active');
  const hasCamelCreated = uoCols.has('createdAt');
  const hasSnakeCreated = uoCols.has('created_at');
  const hasCamelUpdated = uoCols.has('updatedAt');
  const hasSnakeUpdated = uoCols.has('updated_at');

  if (hasCamelUserId) uoColNames.push('userId');
  if (hasSnakeUserId) uoColNames.push('user_id');
  if (hasCamelOrgId) uoColNames.push('organizationId');
  if (hasSnakeOrgId) uoColNames.push('organization_id');
  uoColNames.push('role');
  if (hasCamelActive) uoColNames.push('isActive');
  if (hasSnakeActive) uoColNames.push('is_active');
  if (hasCamelCreated) uoColNames.push('createdAt');
  if (hasSnakeCreated) uoColNames.push('created_at');
  if (hasCamelUpdated) uoColNames.push('updatedAt');
  if (hasSnakeUpdated) uoColNames.push('updated_at');

  const uoRows: any[][] = [];

  for (let i = 0; i < cfg.userCount; i++) {
    const role = pickFromDistribution(i, cfg.userCount, PLATFORM_ROLE_DIST);
    const row: any[] = [userOrgId(cfg, i)];
    if (hasCamelUserId) row.push(userId(cfg, i));
    if (hasSnakeUserId) row.push(userId(cfg, i));
    if (hasCamelOrgId) row.push(orgIdVal);
    if (hasSnakeOrgId) row.push(orgIdVal);
    row.push(role);
    if (hasCamelActive) row.push(true);
    if (hasSnakeActive) row.push(true);
    if (hasCamelCreated) row.push(now);
    if (hasSnakeCreated) row.push(now);
    if (hasCamelUpdated) row.push(now);
    if (hasSnakeUpdated) row.push(now);
    uoRows.push(row);
  }

  await batchInsert(ds, 'user_organizations', uoColNames, uoRows, cfg.batch, 'id', log);

  return { count: cfg.userCount };
}
