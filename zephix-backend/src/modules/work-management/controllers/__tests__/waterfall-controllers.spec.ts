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

describe('EarnedValueController guards', () => {
  let controller: EarnedValueController;
  let evService: any;

  beforeEach(() => {
    evService = {
      computeEarnedValue: jest.fn().mockResolvedValue({
        pv: 100, ev: 80, ac: 90, cpi: 0.89, spi: 0.8,
        eac: null, etc: null, vac: null, bac: 200, asOfDate: '2026-03-20',
      }),
      createSnapshot: jest.fn().mockResolvedValue({ id: 'snap-1' }),
      getHistory: jest.fn().mockResolvedValue([]),
    };
    controller = new EarnedValueController(evService);
  });

  it('guest blocked from earned value', async () => {
    const req = {
      user: { organizationId: 'org-1', platformRole: 'VIEWER' },
      headers: { 'x-workspace-id': 'ws-1', 'x-workspace-role': 'workspace_viewer' },
    };

    await expect(
      controller.getEarnedValue('proj-1', '2026-03-20', undefined, req),
    ).rejects.toThrow(ForbiddenException);
  });

  it('member blocked from earned value', async () => {
    const req = {
      user: { organizationId: 'org-1', platformRole: 'MEMBER' },
      headers: { 'x-workspace-id': 'ws-1', 'x-workspace-role': 'workspace_member' },
    };

    await expect(
      controller.getEarnedValue('proj-1', '2026-03-20', undefined, req),
    ).rejects.toThrow(ForbiddenException);
  });

  it('owner allowed to access earned value', async () => {
    const req = {
      user: { organizationId: 'org-1', platformRole: 'MEMBER' },
      headers: { 'x-workspace-id': 'ws-1', 'x-workspace-role': 'workspace_owner' },
    };

    const result = await controller.getEarnedValue('proj-1', '2026-03-20', undefined, req);
    expect(result.success).toBe(true);
  });

  it('admin allowed to access earned value', async () => {
    const req = {
      user: { organizationId: 'org-1', platformRole: 'ADMIN' },
      headers: { 'x-workspace-id': 'ws-1', 'x-workspace-role': 'workspace_member' },
    };

    const result = await controller.getEarnedValue('proj-1', '2026-03-20', undefined, req);
    expect(result.success).toBe(true);
  });

  it('guest blocked from creating EV snapshot', async () => {
    const req = {
      user: { organizationId: 'org-1', platformRole: 'VIEWER' },
      headers: { 'x-workspace-id': 'ws-1', 'x-workspace-role': 'workspace_viewer' },
    };

    await expect(
      controller.createSnapshot('proj-1', { asOfDate: '2026-03-20' }, req),
    ).rejects.toThrow(ForbiddenException);
  });

  it('guest blocked from EV history', async () => {
    const req = {
      user: { platformRole: 'VIEWER' },
      headers: { 'x-workspace-role': 'workspace_viewer' },
    };

    await expect(
      controller.getHistory('proj-1', undefined, undefined, req),
    ).rejects.toThrow(ForbiddenException);
  });

  it('delivery_owner allowed', async () => {
    const req = {
      user: { organizationId: 'org-1', platformRole: 'MEMBER' },
      headers: { 'x-workspace-id': 'ws-1', 'x-workspace-role': 'delivery_owner' },
    };

    const result = await controller.getEarnedValue('proj-1', '2026-03-20', undefined, req);
    expect(result.success).toBe(true);
  });
});
