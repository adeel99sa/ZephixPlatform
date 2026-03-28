import { NotFoundException } from '@nestjs/common';
import { WorkTasksService } from '../work-tasks.service';
import { TaskStatus } from '../../enums/task.enums';
import { WorkTaskStructuralGuardService } from '../work-task-structural-guard.service';

const auth = {
  organizationId: 'org-1',
  userId: 'user-1',
  platformRole: 'MEMBER',
};
const workspaceId = 'ws-1';

function makeQbMock() {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawMany: jest.fn().mockResolvedValue([]),
    getMany: jest.fn().mockResolvedValue([]),
  };
}

function makeService() {
  const taskQb = makeQbMock();
  const taskRepo = {
    qb: jest.fn().mockReturnValue(taskQb),
  };
  const activityRepo = {
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  const commentRepo = {
    find: jest.fn().mockResolvedValue([]),
  };
  const projectRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 'proj-1' }),
    find: jest.fn().mockResolvedValue([]),
  };

  const service = new WorkTasksService(
    taskRepo as any,
    {} as any,
    commentRepo as any,
    activityRepo as any,
    {} as any,
    { canAccessWorkspace: jest.fn().mockResolvedValue(true) } as any,
    { record: jest.fn().mockResolvedValue(undefined) } as any,
    { assertOrganizationId: jest.fn().mockReturnValue('org-1') } as any,
    {} as any,
    { recalculateProjectHealth: jest.fn().mockResolvedValue(undefined) } as any,
    {
      enforceWipLimitOrThrow: jest.fn().mockResolvedValue(undefined),
      enforceWipLimitBulkOrThrow: jest.fn().mockResolvedValue(undefined),
    } as any,
    projectRepo as any,
    { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) } as any,
    { find: jest.fn(), findOne: jest.fn(), save: jest.fn() } as any,
    { save: jest.fn() } as any,
    new WorkTaskStructuralGuardService(),
    undefined,
    undefined,
  );

  return { service, taskRepo, taskQb, activityRepo, projectRepo, commentRepo };
}

describe('WorkTasksService lane3 insights', () => {
  it('lists project activity with workspace and org scope', async () => {
    const { service, activityRepo, projectRepo } = makeService();
    activityRepo.findAndCount.mockResolvedValueOnce([
      [{ id: 'a1', projectId: 'proj-1' }],
      1,
    ]);

    const result = await service.listProjectActivity(
      auth,
      workspaceId,
      'proj-1',
      25,
      5,
    );

    expect(projectRepo.findOne).toHaveBeenCalled();
    expect(activityRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-1',
          workspaceId,
          projectId: 'proj-1',
        },
        take: 25,
        skip: 5,
      }),
    );
    expect(result.total).toBe(1);
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(5);
  });

  it('throws PROJECT_NOT_FOUND for unknown project activity scope', async () => {
    const { service, projectRepo } = makeService();
    projectRepo.findOne.mockResolvedValueOnce(null);

    const err = await service
      .listProjectActivity(auth, workspaceId, 'missing-project')
      .then(
        () => null,
        (e) => e,
      );

    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.response).toMatchObject({ code: 'PROJECT_NOT_FOUND' });
  });

  it('lists overdue tasks excluding terminal statuses', async () => {
    const { service, taskQb } = makeService();
    taskQb.getManyAndCount.mockResolvedValueOnce([
      [{ id: 't-overdue', status: TaskStatus.TODO }],
      1,
    ]);

    const result = await service.listOverdueTasks(auth, workspaceId, {
      projectId: 'proj-1',
      assigneeUserId: 'user-2',
      limit: 10,
      offset: 1,
    });

    expect(taskQb.andWhere).toHaveBeenCalledWith(
      'task.status NOT IN (:...terminalStatuses)',
      expect.objectContaining({
        terminalStatuses: [TaskStatus.DONE, TaskStatus.CANCELED],
      }),
    );
    expect(result.total).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(1);
  });

  it('returns workload rollup counts per assignee', async () => {
    const { service, taskQb } = makeService();
    taskQb.getRawMany.mockResolvedValueOnce([
      {
        assigneeUserId: 'user-1',
        assignedCount: '6',
        overdueCount: '2',
        dueSoonCount: '3',
      },
    ]);

    const result = await service.getTeamWorkload(auth, workspaceId, 'proj-1');

    expect(result).toEqual([
      {
        assigneeUserId: 'user-1',
        assignedCount: 6,
        overdueCount: 2,
        dueSoonCount: 3,
      },
    ]);
  });

  it('searches project, task, and comment surfaces in workspace scope', async () => {
    const { service, projectRepo, taskQb, commentRepo } = makeService();
    projectRepo.find.mockResolvedValueOnce([
      { id: 'p1', name: 'Project Alpha', status: 'active' },
    ]);
    taskQb.getMany.mockResolvedValueOnce([
      {
        id: 't1',
        title: 'Alpha task',
        status: TaskStatus.TODO,
        priority: 'MEDIUM',
        projectId: 'p1',
        metadata: null,
      },
    ]);
    commentRepo.find.mockResolvedValueOnce([
      {
        id: 'c1',
        body: 'alpha comment',
        taskId: 't1',
        createdByUserId: 'user-1',
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
      },
    ]);

    const result = await service.searchWorkspace(auth, workspaceId, 'alpha', 5);

    expect(result.projects).toHaveLength(1);
    expect(result.tasks).toHaveLength(1);
    expect(result.comments).toHaveLength(1);
  });
});
