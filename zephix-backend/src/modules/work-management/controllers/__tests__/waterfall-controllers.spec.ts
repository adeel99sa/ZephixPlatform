/**
 * Phase 2B: Guard and access control tests for waterfall controllers.
 */
import { ScheduleBaselinesController } from '../schedule-baselines.controller';
import { EarnedValueController } from '../earned-value.controller';
import { ForbiddenException } from '@nestjs/common';

describe('ScheduleBaselinesController guards', () => {
  let controller: ScheduleBaselinesController;
  let baselineService: any;

  beforeEach(() => {
    baselineService = {
      createBaseline: jest.fn().mockResolvedValue({ id: 'bl-1', name: 'Test' }),
      setActiveBaseline: jest.fn(),
    };
    controller = new ScheduleBaselinesController(baselineService);
  });

  it('member blocked from baseline create', async () => {
    const req = {
      user: { organizationId: 'org-1', id: 'user-1', platformRole: 'MEMBER' },
      headers: { 'x-workspace-id': 'ws-1', 'x-workspace-role': 'workspace_member' },
    };

    await expect(
      controller.createBaseline('proj-1', { name: 'Test' }, req),
    ).rejects.toThrow(ForbiddenException);
  });

  it('guest blocked from baseline create', async () => {
    const req = {
      user: { organizationId: 'org-1', id: 'user-1', platformRole: 'VIEWER' },
      headers: { 'x-workspace-id': 'ws-1', 'x-workspace-role': 'workspace_viewer' },
    };

    await expect(
      controller.createBaseline('proj-1', { name: 'Test' }, req),
    ).rejects.toThrow(ForbiddenException);
  });

  it('owner allowed to create baseline', async () => {
    const req = {
      user: { organizationId: 'org-1', id: 'user-1', platformRole: 'MEMBER' },
      headers: { 'x-workspace-id': 'ws-1', 'x-workspace-role': 'workspace_owner' },
    };

    const result = await controller.createBaseline('proj-1', { name: 'Test' }, req);
    expect(result.success).toBe(true);
    expect(baselineService.createBaseline).toHaveBeenCalled();
  });

  it('admin allowed to create baseline', async () => {
    const req = {
      user: { organizationId: 'org-1', id: 'user-1', platformRole: 'ADMIN' },
      headers: { 'x-workspace-id': 'ws-1', 'x-workspace-role': 'workspace_member' },
    };

    const result = await controller.createBaseline('proj-1', { name: 'Test' }, req);
    expect(result.success).toBe(true);
  });

  it('member blocked from activate', async () => {
    const req = {
      user: { platformRole: 'MEMBER' },
      headers: { 'x-workspace-role': 'workspace_member' },
    };

    await expect(
      controller.activateBaseline('bl-1', req),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('EarnedValueController guards (server-derived role)', () => {
  // SEC-XORG-READ-1: authorization is derived from the membership record via
  // WorkspaceRoleGuardService.getWorkspaceRole, NOT the client-supplied
  // x-workspace-role header. These tests drive the mocked server role.
  let controller: EarnedValueController;
  let evService: any;
  let workspaceRoleGuard: any;

  beforeEach(() => {
    evService = {
      computeEarnedValue: jest.fn().mockResolvedValue({
        pv: 100, ev: 80, ac: 90, cpi: 0.89, spi: 0.8,
        eac: null, etc: null, vac: null, bac: 200, asOfDate: '2026-03-20',
      }),
      createSnapshot: jest.fn().mockResolvedValue({ id: 'snap-1' }),
      getHistory: jest.fn().mockResolvedValue([]),
    };
    workspaceRoleGuard = {
      getWorkspaceRole: jest.fn().mockResolvedValue('workspace_member'),
    };
    controller = new EarnedValueController(evService, workspaceRoleGuard);
  });

  const req = (opts: {
    role?: string | null;
    platformRole?: string;
    headerRole?: string;
  }) => {
    if (opts.role !== undefined) {
      workspaceRoleGuard.getWorkspaceRole.mockResolvedValue(opts.role);
    }
    return {
      user: {
        organizationId: 'org-1',
        userId: 'user-1',
        platformRole: opts.platformRole ?? 'MEMBER',
      },
      headers: {
        'x-workspace-id': 'ws-1',
        ...(opts.headerRole ? { 'x-workspace-role': opts.headerRole } : {}),
      },
    };
  };

  it('server role member is blocked from earned value', async () => {
    await expect(
      controller.getEarnedValue('proj-1', '2026-03-20', undefined, req({ role: 'workspace_member' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('non-member (null server role) is blocked', async () => {
    await expect(
      controller.getEarnedValue('proj-1', '2026-03-20', undefined, req({ role: null })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('server role owner is allowed', async () => {
    const result = await controller.getEarnedValue('proj-1', '2026-03-20', undefined, req({ role: 'workspace_owner' }));
    expect(result.success).toBe(true);
    expect(workspaceRoleGuard.getWorkspaceRole).toHaveBeenCalledWith('ws-1', 'user-1');
  });

  it('delivery_owner server role is allowed', async () => {
    const result = await controller.getEarnedValue('proj-1', '2026-03-20', undefined, req({ role: 'delivery_owner' }));
    expect(result.success).toBe(true);
  });

  it('platform admin bypasses the workspace role (no membership lookup)', async () => {
    const result = await controller.getEarnedValue('proj-1', '2026-03-20', undefined, req({ platformRole: 'ADMIN' }));
    expect(result.success).toBe(true);
    expect(workspaceRoleGuard.getWorkspaceRole).not.toHaveBeenCalled();
  });

  it('forged x-workspace-role header is IGNORED — server role wins (regression)', async () => {
    // Caller forges owner in the header but the membership record says member.
    const forged = req({ role: 'workspace_member', headerRole: 'workspace_owner' });
    await expect(
      controller.getEarnedValue('proj-1', '2026-03-20', undefined, forged),
    ).rejects.toThrow(ForbiddenException);
    expect(workspaceRoleGuard.getWorkspaceRole).toHaveBeenCalledWith('ws-1', 'user-1');
  });

  it('snapshot: non-owner server role blocked', async () => {
    await expect(
      controller.createSnapshot('proj-1', { asOfDate: '2026-03-20' }, req({ role: 'workspace_viewer' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('history: non-owner server role blocked', async () => {
    await expect(
      controller.getHistory('proj-1', undefined, undefined, req({ role: null })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('history: owner allowed and org is threaded to the service', async () => {
    const result = await controller.getHistory('proj-1', undefined, undefined, req({ role: 'workspace_owner' }));
    expect(result.success).toBe(true);
    expect(evService.getHistory).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', projectId: 'proj-1' }),
    );
  });
});
