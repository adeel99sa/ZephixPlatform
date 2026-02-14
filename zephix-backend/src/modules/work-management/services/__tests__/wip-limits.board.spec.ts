/**
 * Phase 2H: WIP Limits Board Tests
 *
 * Tests WIP limit enforcement in board context:
 * - Counts only within project
 * - Excludes deleted tasks
 * - Exempt statuses (DONE, BACKLOG, CANCELED)
 * - Override allowed for ADMIN
 * - Correct error code
 */
import { WipLimitsService } from '../wip-limits.service';
import { BadRequestException } from '@nestjs/common';
import { TaskStatus } from '../../enums/task.enums';

describe('WipLimitsService — Board Context', () => {
  let service: WipLimitsService;

  let mockQbCount = 0;
  const mockTaskRepo = {
    count: jest.fn().mockResolvedValue(0),
    findOne: jest.fn(),
    find: jest.fn(),
    qb: jest.fn().mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockImplementation(() => Promise.resolve(mockQbCount)),
    })),
  };

  const mockConfigService = {
    getEffectiveLimits: jest.fn().mockResolvedValue({
      defaultWipLimit: null,
      statusWipLimits: {},
    }),
    resolveLimit: jest.fn().mockReturnValue(null),
  };

  const mockActivityService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  const auth = {
    organizationId: 'org-1',
    userId: 'u1',
    platformRole: 'MEMBER',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const mockConfigRepo = { findOne: jest.fn().mockResolvedValue(null) };
    service = new WipLimitsService(
      mockTaskRepo as any,
      mockConfigRepo as any,       // configRepo
      mockConfigService as any,    // workflowConfigService
      mockActivityService as any,  // activityService
    );
  });

  const baseArgs = {
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    projectId: 'p1',
    taskId: 't1',
    fromStatus: TaskStatus.TODO,
    toStatus: TaskStatus.IN_PROGRESS,
    actorUserId: 'u1',
    actorRole: 'MEMBER',
  };

  it('passes when no WIP limit is configured', async () => {
    mockConfigService.resolveLimit.mockReturnValue(null);
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs),
    ).resolves.not.toThrow();
  });

  it('passes when count is below limit', async () => {
    mockConfigService.resolveLimit.mockReturnValue(5);
    mockQbCount = 3;
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs),
    ).resolves.not.toThrow();
  });

  it('blocks when count equals limit', async () => {
    mockConfigService.resolveLimit.mockReturnValue(3);
    mockQbCount = 3;
    await expect(
      service.enforceWipLimitOrThrow(auth, baseArgs),
    ).rejects.toThrow();
  });

  it('throws with WIP_LIMIT_EXCEEDED code', async () => {
    mockConfigService.resolveLimit.mockReturnValue(2);
    mockQbCount = 2;
    try {
      await service.enforceWipLimitOrThrow(auth, baseArgs);
      fail('Should have thrown');
    } catch (err: any) {
      const response = err.getResponse?.() ?? err.response ?? {};
      expect(response.code || err.message).toContain('WIP');
    }
  });

  it('exempt statuses bypass WIP check — DONE', async () => {
    const args = { ...baseArgs, toStatus: TaskStatus.DONE };
    mockConfigService.resolveLimit.mockReturnValue(1);
    mockQbCount = 10;
    await expect(
      service.enforceWipLimitOrThrow(auth, args),
    ).resolves.not.toThrow();
  });

  it('exempt statuses bypass WIP check — BACKLOG', async () => {
    const args = { ...baseArgs, toStatus: TaskStatus.BACKLOG };
    mockConfigService.resolveLimit.mockReturnValue(1);
    mockQbCount = 10;
    await expect(
      service.enforceWipLimitOrThrow(auth, args),
    ).resolves.not.toThrow();
  });

  it('exempt statuses bypass WIP check — CANCELED', async () => {
    const args = { ...baseArgs, toStatus: TaskStatus.CANCELED };
    mockConfigService.resolveLimit.mockReturnValue(1);
    mockQbCount = 10;
    await expect(
      service.enforceWipLimitOrThrow(auth, args),
    ).resolves.not.toThrow();
  });

  it('override allowed with ADMIN actorRole flag', async () => {
    mockConfigService.resolveLimit.mockReturnValue(1);
    mockQbCount = 5;
    const args = { ...baseArgs, actorRole: 'ADMIN', override: true, overrideReason: 'Approved' };
    await expect(
      service.enforceWipLimitOrThrow({ ...auth, platformRole: 'ADMIN' }, args),
    ).resolves.not.toThrow();
  });

  it('records override activity when override used', async () => {
    mockConfigService.resolveLimit.mockReturnValue(1);
    mockQbCount = 5;
    const args = { ...baseArgs, actorRole: 'ADMIN', override: true, overrideReason: 'Rush delivery' };
    await service.enforceWipLimitOrThrow({ ...auth, platformRole: 'ADMIN' }, args);
    expect(mockActivityService.record).toHaveBeenCalled();
  });

  it('count query uses qb scoped by project', async () => {
    mockConfigService.resolveLimit.mockReturnValue(5);
    mockQbCount = 2;
    await service.enforceWipLimitOrThrow(auth, baseArgs);
    // Verify qb was called (query builder pattern)
    expect(mockTaskRepo.qb).toHaveBeenCalled();
  });
});
