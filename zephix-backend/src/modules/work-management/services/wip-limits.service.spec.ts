import { WipLimitsService } from './wip-limits.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

// ---------- Mocks ----------
const mockTaskRepo = {
  qb: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getCount: jest.fn(),
};

// Chain self-reference for query builder
mockTaskRepo.qb.mockReturnValue(mockTaskRepo);

const mockConfigRepo = {
  findOne: jest.fn(),
};

const mockWorkflowConfigService = {
  resolveLimit: jest.fn(),
};

const mockActivityService = {
  record: jest.fn().mockResolvedValue({}),
};

const auth = {
  organizationId: 'org-1',
  userId: 'user-1',
  platformRole: 'MEMBER',
};

const adminAuth = {
  organizationId: 'org-1',
  userId: 'admin-1',
  platformRole: 'ADMIN',
};

function baseArgs(overrides: Partial<any> = {}) {
  return {
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    projectId: 'proj-1',
    taskId: 'task-1',
    fromStatus: 'TODO',
    toStatus: 'IN_PROGRESS',
    actorUserId: 'user-1',
    actorRole: 'MEMBER',
    override: false,
    ...overrides,
  };
}

describe('WipLimitsService', () => {
  let service: WipLimitsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WipLimitsService(
      mockTaskRepo as any,
      mockConfigRepo as any,
      mockWorkflowConfigService as any,
      mockActivityService as any,
    );
  });

  // 1. No limit configured => allow
  it('allows move when no limit configured', async () => {
    mockConfigRepo.findOne.mockResolvedValue(null);
    mockWorkflowConfigService.resolveLimit.mockReturnValue(null);
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs()),
    ).resolves.toBeUndefined();
  });

  // 2. Default limit hit => WIP_LIMIT_EXCEEDED
  it('blocks with WIP_LIMIT_EXCEEDED when default limit hit', async () => {
    mockConfigRepo.findOne.mockResolvedValue({ defaultWipLimit: 2 });
    mockWorkflowConfigService.resolveLimit.mockReturnValue(2);
    mockTaskRepo.getCount.mockResolvedValue(2);
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs()),
    ).rejects.toThrow(BadRequestException);
    try {
      await service.enforceWipLimitOrThrow(auth, baseArgs());
    } catch (e: any) {
      expect(e.response.code).toBe('WIP_LIMIT_EXCEEDED');
      expect(e.response.limit).toBe(2);
      expect(e.response.current).toBe(2);
      expect(e.response.status).toBe('IN_PROGRESS');
    }
  });

  // 3. Per-status limit overrides default
  it('uses per-status limit over default', async () => {
    mockConfigRepo.findOne.mockResolvedValue({
      defaultWipLimit: 5,
      statusWipLimits: { IN_PROGRESS: 1 },
    });
    mockWorkflowConfigService.resolveLimit.mockReturnValue(1);
    mockTaskRepo.getCount.mockResolvedValue(1);
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs()),
    ).rejects.toThrow(BadRequestException);
  });

  // 4. DONE never blocks
  it('allows move to DONE regardless of count', async () => {
    mockConfigRepo.findOne.mockResolvedValue({ defaultWipLimit: 1 });
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs({ toStatus: 'DONE' })),
    ).resolves.toBeUndefined();
    expect(mockTaskRepo.getCount).not.toHaveBeenCalled();
  });

  // 5. BACKLOG never blocks
  it('allows move to BACKLOG regardless of count', async () => {
    mockConfigRepo.findOne.mockResolvedValue({ defaultWipLimit: 1 });
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs({ toStatus: 'BACKLOG' })),
    ).resolves.toBeUndefined();
    expect(mockTaskRepo.getCount).not.toHaveBeenCalled();
  });

  // 6. Override false blocks
  it('blocks when override is false and limit exceeded', async () => {
    mockConfigRepo.findOne.mockResolvedValue({ defaultWipLimit: 3 });
    mockWorkflowConfigService.resolveLimit.mockReturnValue(3);
    mockTaskRepo.getCount.mockResolvedValue(3);
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs({ override: false })),
    ).rejects.toThrow(BadRequestException);
  });

  // 7. Override true with admin allows and logs
  it('allows override with ADMIN role and logs activity', async () => {
    mockConfigRepo.findOne.mockResolvedValue({ defaultWipLimit: 2 });
    mockWorkflowConfigService.resolveLimit.mockReturnValue(2);
    mockTaskRepo.getCount.mockResolvedValue(2);
    await expect(
      service.enforceWipLimitOrThrow(adminAuth, baseArgs({
        override: true,
        actorRole: 'ADMIN',
        actorUserId: 'admin-1',
        overrideReason: 'urgent fix',
      })),
    ).resolves.toBeUndefined();
    expect(mockActivityService.record).toHaveBeenCalledWith(
      adminAuth,
      'ws-1',
      'task-1',
      'TASK_WIP_OVERRIDE',
      expect.objectContaining({
        toStatus: 'IN_PROGRESS',
        limit: 2,
        current: 2,
        reason: 'urgent fix',
      }),
    );
  });

  // 8. Override true with non-admin throws WIP_OVERRIDE_FORBIDDEN
  it('rejects override from non-admin', async () => {
    mockConfigRepo.findOne.mockResolvedValue({ defaultWipLimit: 2 });
    mockWorkflowConfigService.resolveLimit.mockReturnValue(2);
    mockTaskRepo.getCount.mockResolvedValue(2);
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs({
        override: true,
        actorRole: 'MEMBER',
      })),
    ).rejects.toThrow(ForbiddenException);
    try {
      await service.enforceWipLimitOrThrow(auth, baseArgs({
        override: true,
        actorRole: 'MEMBER',
      }));
    } catch (e: any) {
      expect(e.response.code).toBe('WIP_OVERRIDE_FORBIDDEN');
    }
  });

  // 9. Same-status move does not block
  it('does not block when moving within same status', async () => {
    mockConfigRepo.findOne.mockResolvedValue({ defaultWipLimit: 1 });
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs({
        fromStatus: 'IN_PROGRESS',
        toStatus: 'IN_PROGRESS',
      })),
    ).resolves.toBeUndefined();
    expect(mockTaskRepo.getCount).not.toHaveBeenCalled();
  });

  // 10. Count excludes the moving task itself
  it('excludes the task itself when counting current WIP', async () => {
    mockConfigRepo.findOne.mockResolvedValue({ defaultWipLimit: 2 });
    mockWorkflowConfigService.resolveLimit.mockReturnValue(2);
    mockTaskRepo.getCount.mockResolvedValue(1); // only 1 other task in that status
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs()),
    ).resolves.toBeUndefined();

    // Verify the query builder excludes taskId
    expect(mockTaskRepo.andWhere).toHaveBeenCalledWith(
      'task.id != :taskId',
      { taskId: 'task-1' },
    );
  });

  // 11. CANCELED never blocks
  it('allows move to CANCELED', async () => {
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs({ toStatus: 'CANCELED' })),
    ).resolves.toBeUndefined();
  });

  // 12. Under limit allows move
  it('allows move when under limit', async () => {
    mockConfigRepo.findOne.mockResolvedValue({ defaultWipLimit: 5 });
    mockWorkflowConfigService.resolveLimit.mockReturnValue(5);
    mockTaskRepo.getCount.mockResolvedValue(2);
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs()),
    ).resolves.toBeUndefined();
  });
});
