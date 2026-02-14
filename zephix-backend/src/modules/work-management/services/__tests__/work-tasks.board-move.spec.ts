/**
 * Phase 2H: Board Move Tests
 *
 * Tests status transitions via updateTask (the board drag handler),
 * rank assignment, WIP enforcement, and cross-org isolation.
 */
import { WorkTasksService } from '../work-tasks.service';
import { BadRequestException } from '@nestjs/common';
import { TaskStatus, TaskPriority, TaskType } from '../../enums/task.enums';

describe('WorkTasksService — Board Move', () => {
  let service: WorkTasksService;

  // ── Mocks ──────────────────────────────────────────────────────────

  const makeTask = (overrides: Partial<any> = {}) => ({
    id: 't1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    projectId: 'p1',
    title: 'Test Task',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    type: TaskType.TASK,
    assigneeUserId: 'u1',
    rank: 0,
    deletedAt: null,
    ...overrides,
  });

  const mockTaskRepo = {
    save: jest.fn((entity: any) => Promise.resolve(entity)),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockProjectRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 'p1', estimationMode: 'both' }),
    createQueryBuilder: jest.fn(),
  };

  const mockWipService = {
    enforceWipLimitOrThrow: jest.fn().mockResolvedValue(undefined),
    enforceWipLimitBulkOrThrow: jest.fn(),
  };

  const mockActivityService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  const mockTenantContext = {
    assertOrganizationId: jest.fn().mockReturnValue('org-1'),
  };

  const mockWorkspaceAccessService = { requireWorkspaceRead: jest.fn(), requireWorkspaceWrite: jest.fn() };
  const mockTenantCtx = { assertOrganizationId: jest.fn().mockReturnValue('org-1') };
  const mockDataSource = {};
  const mockProjectHealthService = { recalculate: jest.fn() };

  const auth = {
    userId: 'u1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    platformRole: 'MEMBER',
    roles: [],
    email: 'test@test.com',
  };

  const wsId = 'ws-1';

  beforeEach(() => {
    jest.clearAllMocks();
    // Construct service with all 13 mocked deps
    service = new WorkTasksService(
      mockTaskRepo as any,          // taskRepo
      {} as any,                    // dependencyRepo
      {} as any,                    // commentRepo
      {} as any,                    // activityRepo
      {} as any,                    // workPhaseRepository
      mockWorkspaceAccessService as any, // workspaceAccessService
      mockActivityService as any,   // activityService
      mockTenantCtx as any,         // tenantContext
      mockDataSource as any,        // dataSource
      mockProjectHealthService as any, // projectHealthService
      mockWipService as any,        // wipLimitsService
      mockProjectRepo as any,       // projectRepository
      { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) } as any,
    );
    // Mock internal methods
    (service as any).assertWorkspaceAccess = jest.fn().mockResolvedValue(undefined);
    (service as any).getActiveTaskOrFail = jest.fn().mockResolvedValue(makeTask());
  });

  // ── Status transitions ──────────────────────────────────────────────

  it('updates status from TODO to IN_PROGRESS', async () => {
    const result = await service.updateTask(auth, wsId, 't1', { status: TaskStatus.IN_PROGRESS });
    expect(result.status).toBe(TaskStatus.IN_PROGRESS);
  });

  it('updates status from IN_PROGRESS to IN_REVIEW', async () => {
    (service as any).getActiveTaskOrFail.mockResolvedValue(makeTask({ status: TaskStatus.IN_PROGRESS }));
    const result = await service.updateTask(auth, wsId, 't1', { status: TaskStatus.IN_REVIEW });
    expect(result.status).toBe(TaskStatus.IN_REVIEW);
  });

  it('updates status from IN_REVIEW to DONE', async () => {
    (service as any).getActiveTaskOrFail.mockResolvedValue(makeTask({ status: TaskStatus.IN_REVIEW }));
    const result = await service.updateTask(auth, wsId, 't1', { status: TaskStatus.DONE });
    expect(result.status).toBe(TaskStatus.DONE);
    expect(result.completedAt).toBeDefined();
  });

  it('sets completedAt when moving to DONE from IN_REVIEW', async () => {
    (service as any).getActiveTaskOrFail.mockResolvedValue(makeTask({ status: TaskStatus.IN_REVIEW }));
    const result = await service.updateTask(auth, wsId, 't1', { status: TaskStatus.DONE });
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  // ── Rank assignment ─────────────────────────────────────────────────

  it('updates rank when provided in DTO', async () => {
    const result = await service.updateTask(auth, wsId, 't1', { rank: 42 });
    expect(result.rank).toBe(42);
  });

  it('updates both status and rank in a single board move', async () => {
    const result = await service.updateTask(auth, wsId, 't1', {
      status: TaskStatus.IN_PROGRESS,
      rank: 10,
    });
    expect(result.status).toBe(TaskStatus.IN_PROGRESS);
    expect(result.rank).toBe(10);
  });

  it('rank update without status change does not trigger WIP check', async () => {
    await service.updateTask(auth, wsId, 't1', { rank: 5 });
    expect(mockWipService.enforceWipLimitOrThrow).not.toHaveBeenCalled();
  });

  // ── WIP enforcement ─────────────────────────────────────────────────

  it('calls WIP enforcement on status change', async () => {
    await service.updateTask(auth, wsId, 't1', { status: TaskStatus.IN_PROGRESS });
    expect(mockWipService.enforceWipLimitOrThrow).toHaveBeenCalledWith(
      auth,
      expect.objectContaining({
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        projectId: 'p1',
        taskId: 't1',
      }),
    );
  });

  it('blocks move when WIP limit exceeded', async () => {
    mockWipService.enforceWipLimitOrThrow.mockRejectedValueOnce(
      new BadRequestException({ code: 'WIP_LIMIT_EXCEEDED', message: 'WIP limit exceeded for IN_PROGRESS' }),
    );
    await expect(
      service.updateTask(auth, wsId, 't1', { status: TaskStatus.IN_PROGRESS }),
    ).rejects.toThrow(BadRequestException);
  });

  it('WIP check receives override flag when provided', async () => {
    await service.updateTask(auth, wsId, 't1', {
      status: TaskStatus.IN_PROGRESS,
      wipOverride: true,
      wipOverrideReason: 'Admin override',
    });
    expect(mockWipService.enforceWipLimitOrThrow).toHaveBeenCalledWith(
      auth,
      expect.objectContaining({
        override: true,
        overrideReason: 'Admin override',
      }),
    );
  });

  // ── Status transition validation ────────────────────────────────────

  it('blocks invalid status transition (DONE to IN_REVIEW)', async () => {
    (service as any).getActiveTaskOrFail.mockResolvedValue(makeTask({ status: TaskStatus.DONE }));
    await expect(
      service.updateTask(auth, wsId, 't1', { status: TaskStatus.IN_REVIEW }),
    ).rejects.toThrow();
  });

  // ── Cross-org isolation ─────────────────────────────────────────────

  it('calls assertWorkspaceAccess on every update', async () => {
    await service.updateTask(auth, wsId, 't1', { status: TaskStatus.IN_PROGRESS });
    expect((service as any).assertWorkspaceAccess).toHaveBeenCalledWith(auth, wsId);
  });

  it('blocks mutations on deleted tasks', async () => {
    (service as any).getActiveTaskOrFail.mockRejectedValue(
      new BadRequestException('Task is deleted'),
    );
    await expect(
      service.updateTask(auth, wsId, 't1', { status: TaskStatus.IN_PROGRESS }),
    ).rejects.toThrow();
  });

  // ── Activity recording ──────────────────────────────────────────────

  it('records activity on status change', async () => {
    await service.updateTask(auth, wsId, 't1', { status: TaskStatus.IN_PROGRESS });
    expect(mockActivityService.record).toHaveBeenCalled();
  });

  // ── Estimation mode enforcement still works during board move ──────

  it('rejects estimation mode violation during board move with estimate', async () => {
    mockProjectRepo.findOne.mockResolvedValueOnce({ id: 'p1', estimationMode: 'hours_only' });
    await expect(
      service.updateTask(auth, wsId, 't1', {
        status: TaskStatus.IN_PROGRESS,
        estimatePoints: 5,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
