/**
 * Phase 2F: Scenarios Controller Guard Tests
 *
 * Tests role enforcement:
 * - VIEWER blocked from all scenario endpoints
 * - MEMBER can read but not write
 * - ADMIN can read and write
 */
import { ScenariosController } from '../scenarios.controller';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

function makeReq(platformRole: string, userId = 'user-1', orgId = 'org-1') {
  return {
    user: {
      id: userId,
      organizationId: orgId,
      workspaceId: 'ws-1',
      platformRole,
      roles: [],
      email: 'test@test.com',
    },
  } as any;
}

const wsId = '11111111-1111-1111-1111-111111111111';

const mockScenariosService = {
  create: jest.fn().mockResolvedValue({ id: 'sc-1', name: 'Test', status: 'draft' }),
  list: jest.fn().mockResolvedValue([]),
  getById: jest.fn().mockResolvedValue({ id: 'sc-1', name: 'Test', actions: [], result: null }),
  update: jest.fn().mockResolvedValue({ id: 'sc-1' }),
  softDelete: jest.fn().mockResolvedValue(undefined),
  addAction: jest.fn().mockResolvedValue({ id: 'a-1' }),
  removeAction: jest.fn().mockResolvedValue(undefined),
};

const mockComputeService = {
  compute: jest.fn().mockResolvedValue({
    summary: { before: {}, after: {}, deltas: {}, impactedProjects: [] },
    warnings: [],
  }),
};

const mockResponseService = {
  success: jest.fn((data: any) => ({ data, success: true })),
};

const mockGuard = {
  requireWorkspaceRead: jest.fn(),
  requireWorkspaceWrite: jest.fn(),
};

describe('ScenariosController', () => {
  let controller: ScenariosController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ScenariosController(
      mockScenariosService as any,
      mockComputeService as any,
      mockGuard as any,
      mockResponseService as any,
    );
  });

  // ── VIEWER blocked everywhere ────────────────────────────────────────

  it('VIEWER blocked from listing scenarios', async () => {
    const req = makeReq('VIEWER');
    await expect(controller.list(req, wsId)).rejects.toThrow(ForbiddenException);
  });

  it('VIEWER blocked from getting scenario by id', async () => {
    const req = makeReq('VIEWER');
    await expect(controller.getById(req, 'sc-1')).rejects.toThrow(ForbiddenException);
  });

  it('VIEWER blocked from creating scenario', async () => {
    const req = makeReq('VIEWER');
    await expect(
      controller.create(req, wsId, { name: 'Test', scopeType: 'project', scopeId: 'p1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('VIEWER blocked from compute', async () => {
    const req = makeReq('VIEWER');
    await expect(controller.compute(req, 'sc-1')).rejects.toThrow(ForbiddenException);
  });

  // ── MEMBER can read but not write ───────────────────────────────────

  it('MEMBER can list scenarios', async () => {
    mockGuard.requireWorkspaceRead.mockResolvedValue(undefined);
    const req = makeReq('MEMBER');
    await expect(controller.list(req, wsId)).resolves.toBeDefined();
  });

  it('MEMBER can get scenario by id', async () => {
    const req = makeReq('MEMBER');
    await expect(controller.getById(req, 'sc-1')).resolves.toBeDefined();
  });

  it('MEMBER blocked from creating scenario', async () => {
    const req = makeReq('MEMBER');
    await expect(
      controller.create(req, wsId, { name: 'Test', scopeType: 'project', scopeId: 'p1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('MEMBER blocked from updating scenario', async () => {
    const req = makeReq('MEMBER');
    await expect(controller.update(req, 'sc-1', { name: 'Updated' })).rejects.toThrow(ForbiddenException);
  });

  it('MEMBER blocked from deleting scenario', async () => {
    const req = makeReq('MEMBER');
    await expect(controller.remove(req, 'sc-1')).rejects.toThrow(ForbiddenException);
  });

  it('MEMBER blocked from adding action', async () => {
    const req = makeReq('MEMBER');
    await expect(
      controller.addAction(req, 'sc-1', { actionType: 'shift_project', payload: {} }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('MEMBER blocked from compute', async () => {
    const req = makeReq('MEMBER');
    await expect(controller.compute(req, 'sc-1')).rejects.toThrow(ForbiddenException);
  });

  // ── ADMIN has full access ───────────────────────────────────────────

  it('ADMIN can create scenario', async () => {
    const req = makeReq('ADMIN');
    await expect(
      controller.create(req, wsId, { name: 'Test', scopeType: 'project', scopeId: 'p1' }),
    ).resolves.toBeDefined();
  });

  it('ADMIN can update scenario', async () => {
    const req = makeReq('ADMIN');
    await expect(controller.update(req, 'sc-1', { name: 'Updated' })).resolves.toBeDefined();
  });

  it('ADMIN can delete scenario', async () => {
    const req = makeReq('ADMIN');
    await expect(controller.remove(req, 'sc-1')).resolves.toBeDefined();
  });

  it('ADMIN can add action', async () => {
    const req = makeReq('ADMIN');
    await expect(
      controller.addAction(req, 'sc-1', { actionType: 'shift_project', payload: { projectId: 'p1', shiftDays: 5 } }),
    ).resolves.toBeDefined();
  });

  it('ADMIN can remove action', async () => {
    const req = makeReq('ADMIN');
    await expect(controller.removeAction(req, 'sc-1', 'a-1')).resolves.toBeDefined();
  });

  it('ADMIN can compute', async () => {
    const req = makeReq('ADMIN');
    await expect(controller.compute(req, 'sc-1')).resolves.toBeDefined();
  });

  // ── Validation ──────────────────────────────────────────────────────

  it('rejects invalid actionType', async () => {
    const req = makeReq('ADMIN');
    await expect(
      controller.addAction(req, 'sc-1', { actionType: 'invalid_type' as any, payload: {} }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects create with invalid scopeType', async () => {
    const req = makeReq('ADMIN');
    await expect(
      controller.create(req, wsId, { name: 'Test', scopeType: 'invalid' as any, scopeId: 'p1' }),
    ).rejects.toThrow(BadRequestException);
  });
});
