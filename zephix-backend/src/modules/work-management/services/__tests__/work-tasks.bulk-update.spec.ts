/**
 * Bulk status update — tenant scope and soft-delete regression tests.
 *
 * Verifies:
 *  1. taskRepo.update criteria always contains workspaceId and deletedAt: IsNull()
 *  2. tenantContext.assertOrganizationId() is called (proves org scope is asserted)
 *  3. Tasks from a foreign workspace are excluded via the find pre-check (NotFoundException)
 *  4. Soft-deleted tasks are excluded from the pre-check find and therefore never updated
 */
import { NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { WorkTasksService } from '../work-tasks.service';
import { TaskStatus } from '../../enums/task.enums';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ORG_ID = 'org-a';
const WS_A = 'ws-a';
const WS_B = 'ws-b';

function makeTask(id: string, workspaceId = WS_A, deletedAt: Date | null = null) {
  return {
    id,
    organizationId: ORG_ID,
    workspaceId,
    status: TaskStatus.TODO,
    deletedAt,
  };
}

const authCtx = {
  userId: 'u1',
  organizationId: ORG_ID,
  workspaceId: WS_A,
  platformRole: 'MEMBER',
  roles: [],
  email: 'test@example.com',
};

// ── Service factory ───────────────────────────────────────────────────────────

function makeService(taskRepoOverrides: Record<string, jest.Mock> = {}) {
  const mockTaskRepo = {
    find: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 0 }),
    ...taskRepoOverrides,
  };

  const mockTenantCtx = {
    assertOrganizationId: jest.fn().mockReturnValue(ORG_ID),
  };

  const mockWorkspaceAccess = {
    requireWorkspaceRead: jest.fn(),
    requireWorkspaceWrite: jest.fn(),
  };

  const mockProjectHealthService = {
    recalculateProjectHealth: jest.fn().mockResolvedValue(undefined),
  };

  const mockWipService = {
    enforceWipLimitOrThrow: jest.fn().mockResolvedValue(undefined),
    enforceWipLimitBulkOrThrow: jest.fn().mockResolvedValue(undefined),
  };

  const service = new WorkTasksService(
    mockTaskRepo as any,          // taskRepo
    {} as any,                    // dependencyRepo
    {} as any,                    // commentRepo
    {} as any,                    // activityRepo
    {} as any,                    // workPhaseRepository
    mockWorkspaceAccess as any,   // workspaceAccessService
    { record: jest.fn().mockResolvedValue(undefined) } as any, // activityService
    mockTenantCtx as any,         // tenantContext
    {} as any,                    // dataSource
    mockProjectHealthService as any, // projectHealthService
    mockWipService as any,        // wipLimitsService
    {} as any,                    // projectRepository
    { log: jest.fn(), logBulk: jest.fn() } as any, // auditService
    undefined,                    // governanceEngine (optional)
    undefined,                    // domainEventEmitter (optional)
  );

  // Stub workspace access guard — not under test here
  (service as any).assertWorkspaceAccess = jest.fn().mockResolvedValue(undefined);

  return { service, mockTaskRepo, mockTenantCtx };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WorkTasksService.bulkUpdateStatus — tenant scope and soft-delete', () => {
  describe('update criteria correctness', () => {
    it('passes workspaceId and deletedAt:IsNull to taskRepo.update', async () => {
      const { service, mockTaskRepo } = makeService({
        find: jest.fn().mockResolvedValue([
          makeTask('t1'),
          makeTask('t2'),
        ]),
      });

      await service.bulkUpdateStatus(authCtx, WS_A, {
        taskIds: ['t1', 't2'],
        status: TaskStatus.IN_PROGRESS,
      });

      expect(mockTaskRepo.update).toHaveBeenCalledTimes(1);
      const [criteria] = mockTaskRepo.update.mock.calls[0];

      expect(criteria).toMatchObject({
        workspaceId: WS_A,
        deletedAt: IsNull(),
      });
      expect(criteria.id).toBeDefined(); // In(taskIds)
    });

    it('asserts organizationId from tenantContext before update', async () => {
      const { service, mockTaskRepo, mockTenantCtx } = makeService({
        find: jest.fn().mockResolvedValue([makeTask('t1')]),
      });

      await service.bulkUpdateStatus(authCtx, WS_A, {
        taskIds: ['t1'],
        status: TaskStatus.IN_PROGRESS,
      });

      expect(mockTenantCtx.assertOrganizationId).toHaveBeenCalled();
      expect(mockTaskRepo.update).toHaveBeenCalled();
    });

    it('sets status in the update payload', async () => {
      const { service, mockTaskRepo } = makeService({
        find: jest.fn().mockResolvedValue([makeTask('t1')]),
      });

      await service.bulkUpdateStatus(authCtx, WS_A, {
        taskIds: ['t1'],
        status: TaskStatus.IN_PROGRESS,
      });

      const [, payload] = mockTaskRepo.update.mock.calls[0];
      expect(payload).toMatchObject({ status: TaskStatus.IN_PROGRESS });
    });
  });

  describe('cross-workspace isolation', () => {
    it('throws NotFoundException when taskIds contains a task from a foreign workspace', async () => {
      // find returns only 1 task (workspace A); t2 belongs to workspace B and is excluded
      const { service } = makeService({
        find: jest.fn().mockResolvedValue([makeTask('t1', WS_A)]),
      });

      await expect(
        service.bulkUpdateStatus(authCtx, WS_A, {
          taskIds: ['t1', 't2-from-ws-b'],
          status: TaskStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('does not call taskRepo.update when pre-check find misses tasks', async () => {
      const { service, mockTaskRepo } = makeService({
        find: jest.fn().mockResolvedValue([makeTask('t1', WS_A)]),
      });

      await expect(
        service.bulkUpdateStatus(authCtx, WS_A, {
          taskIds: ['t1', 't2-from-ws-b'],
          status: TaskStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockTaskRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('soft-delete exclusion', () => {
    it('throws NotFoundException when all taskIds are soft-deleted', async () => {
      // find with deletedAt:IsNull returns empty — soft-deleted tasks are invisible
      const { service } = makeService({
        find: jest.fn().mockResolvedValue([]),
      });

      await expect(
        service.bulkUpdateStatus(authCtx, WS_A, {
          taskIds: ['deleted-task-1'],
          status: TaskStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('the update criteria includes deletedAt:IsNull so even a direct DB call cannot touch soft-deleted rows', async () => {
      const { service, mockTaskRepo } = makeService({
        find: jest.fn().mockResolvedValue([makeTask('t1')]),
      });

      await service.bulkUpdateStatus(authCtx, WS_A, {
        taskIds: ['t1'],
        status: TaskStatus.IN_PROGRESS,
      });

      const [criteria] = mockTaskRepo.update.mock.calls[0];
      // IsNull() from typeorm — confirms the filter is applied at SQL level
      expect(criteria.deletedAt).toEqual(IsNull());
    });
  });
});
