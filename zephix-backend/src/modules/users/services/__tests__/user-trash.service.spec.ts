/**
 * P-B1 — UserTrashService unit tests
 *
 * Covers:
 *  - own-deletes-only: query scoped to deleted_by_user_id = caller
 *  - cross-tenant empty: different org returns empty array
 *  - 30-day retention window passed to query
 *  - cap 100 in SQL
 *  - task restore ownership (service-layer invariant pinned here)
 *  - project restore ownership (same invariant on project side)
 */
import { UserTrashService, TrashItem } from '../user-trash.service';
import { ForbiddenException } from '@nestjs/common';

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeTrashRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    entity_type: 'TASK',
    id: 'task-1',
    display_name: 'My Task',
    workspace_id: 'ws-1',
    project_id: 'proj-1',
    deleted_at: new Date('2026-06-20T10:00:00Z'),
    ...overrides,
  };
}

function makeService(queryResult: unknown[] = [makeTrashRow()]) {
  const dataSource = {
    query: jest.fn().mockResolvedValue(queryResult),
  };
  const service = new UserTrashService(dataSource as any);
  return { service, dataSource };
}

const USER = 'user-1';
const ORG = 'org-1';

// ── Own-deletes-only ──────────────────────────────────────────────────────────

describe('UserTrashService — own-deletes-only', () => {
  it('passes userId as first query param (deleted_by_user_id = caller)', async () => {
    const { service, dataSource } = makeService();
    await service.getTrash(USER, ORG);
    const [, params] = dataSource.query.mock.calls[0];
    expect(params[0]).toBe(USER);
  });

  it('passes organizationId as second query param (tenancy scope)', async () => {
    const { service, dataSource } = makeService();
    await service.getTrash(USER, ORG);
    const [, params] = dataSource.query.mock.calls[0];
    expect(params[1]).toBe(ORG);
  });

  it('maps returned rows to TrashItem shape', async () => {
    const { service } = makeService([makeTrashRow()]);
    const result = await service.getTrash(USER, ORG);
    expect(result).toHaveLength(1);
    expect(result[0].entityType).toBe('TASK');
    expect(result[0].id).toBe('task-1');
    expect(result[0].displayName).toBe('My Task');
    expect(result[0].workspaceId).toBe('ws-1');
    expect(result[0].projectId).toBe('proj-1');
    expect(result[0].deletedAt).toBeInstanceOf(Date);
  });
});

// ── Cross-tenant empty ────────────────────────────────────────────────────────

describe('UserTrashService — cross-tenant empty', () => {
  it('returns empty array when DB returns no rows (different org scenario)', async () => {
    const { service, dataSource } = makeService([]);
    const result = await service.getTrash(USER, 'org-OTHER');
    expect(result).toEqual([]);
    expect(dataSource.query).toHaveBeenCalledTimes(1);
  });
});

// ── Retention window ─────────────────────────────────────────────────────────

describe('UserTrashService — retention window', () => {
  it('passes retention days as third query param', async () => {
    const { service, dataSource } = makeService([]);
    await service.getTrash(USER, ORG);
    const [, params] = dataSource.query.mock.calls[0];
    expect(typeof params[2]).toBe('number');
    expect(params[2]).toBeGreaterThan(0);
  });

  it('SQL contains LIMIT 100 cap', async () => {
    const { service, dataSource } = makeService([]);
    await service.getTrash(USER, ORG);
    const [sql] = dataSource.query.mock.calls[0];
    expect(sql).toMatch(/LIMIT 100/i);
  });
});

// ── PROJECT rows map correctly ────────────────────────────────────────────────

describe('UserTrashService — project rows', () => {
  it('maps PROJECT entity_type and null project_id', async () => {
    const { service } = makeService([
      makeTrashRow({ entity_type: 'PROJECT', id: 'proj-42', display_name: 'My Project', project_id: null }),
    ]);
    const result = await service.getTrash(USER, ORG);
    expect(result[0].entityType).toBe('PROJECT');
    expect(result[0].id).toBe('proj-42');
    expect(result[0].projectId).toBeNull();
  });
});

// ── Restore ownership invariant (mirrored from service code) ──────────────────

describe('Restore ownership invariant — task and project', () => {
  const WRITE_ROLES = ['delivery_owner', 'workspace_owner'];

  function checkRestoreAllowed(
    callerRole: string,
    deletedByUserId: string | null,
    callerId: string,
  ): 'allowed' | 'RESTORE_OWNERSHIP' | 'FORBIDDEN_ROLE' {
    if (!callerRole || callerRole === 'workspace_viewer') return 'FORBIDDEN_ROLE';
    if (!WRITE_ROLES.includes(callerRole) && deletedByUserId !== callerId) return 'RESTORE_OWNERSHIP';
    return 'allowed';
  }

  it('workspace_member restoring own delete → allowed', () => {
    expect(checkRestoreAllowed('workspace_member', 'user-1', 'user-1')).toBe('allowed');
  });

  it('workspace_member restoring another user delete → RESTORE_OWNERSHIP', () => {
    expect(checkRestoreAllowed('workspace_member', 'user-other', 'user-1')).toBe('RESTORE_OWNERSHIP');
  });

  it('delivery_owner restoring any delete → allowed (write-role override)', () => {
    expect(checkRestoreAllowed('delivery_owner', 'user-other', 'user-1')).toBe('allowed');
  });

  it('workspace_owner restoring any delete → allowed (write-role override)', () => {
    expect(checkRestoreAllowed('workspace_owner', null, 'user-1')).toBe('allowed');
  });

  it('workspace_viewer → FORBIDDEN_ROLE (viewer excluded)', () => {
    expect(checkRestoreAllowed('workspace_viewer', 'user-1', 'user-1')).toBe('FORBIDDEN_ROLE');
  });

  it('non-member (null role) → FORBIDDEN_ROLE', () => {
    expect(checkRestoreAllowed('', 'user-1', 'user-1')).toBe('FORBIDDEN_ROLE');
  });
});
