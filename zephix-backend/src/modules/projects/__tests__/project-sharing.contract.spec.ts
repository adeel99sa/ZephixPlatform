import { ProjectsService } from '../services/projects.service';

describe('project sharing contract', () => {
  function createService(input?: {
    accessibleWorkspaceIds: string[] | null;
    rows?: any[];
    total?: number;
  }) {
    const accessibleWorkspaceIds = input?.accessibleWorkspaceIds ?? [];
    const rows = input?.rows ?? [];
    const total = input?.total ?? rows.length;

    const qbState = {
      andWhereCalls: [] as string[],
    };

    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn((sql: string) => {
        qbState.andWhereCalls.push(sql);
        return queryBuilder;
      }),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
    };

    const projectRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    const workspaceAccessService = {
      getAccessibleWorkspaceIds: jest
        .fn()
        .mockResolvedValue(accessibleWorkspaceIds),
      canAccessWorkspace: jest.fn(),
    };

    const service = new ProjectsService(
      projectRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { assertOrganizationId: jest.fn().mockReturnValue('org-1') } as any,
      {} as any,
      workspaceAccessService as any,
      { assertWithinLimit: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    return { service, qbState, queryBuilder };
  }

  it('returns only shared projects when user has project-only access in a workspace', async () => {
    const { service, qbState } = createService({
      accessibleWorkspaceIds: [],
      rows: [{ id: 'p-shared-1', workspaceId: 'ws-1', projectManagerId: 'u-1' }],
      total: 1,
    });

    const result = await service.findAllProjects('org-1', {
      workspaceId: 'ws-1',
      userId: 'u-1',
      userRole: 'MEMBER',
      page: 1,
      limit: 20,
    });

    expect(result.projects).toHaveLength(1);
    expect(qbState.andWhereCalls).toContain(
      '(project.projectManagerId = :userId OR project.deliveryOwnerUserId = :userId)',
    );
  });

  it('returns empty when user has neither workspace nor project access', async () => {
    const { service, queryBuilder } = createService({
      accessibleWorkspaceIds: [],
      rows: [],
      total: 0,
    });

    const result = await service.findAllProjects('org-1', {
      workspaceId: 'ws-1',
      userId: undefined,
      userRole: 'VIEWER',
      page: 1,
      limit: 20,
    });

    expect(result.projects).toEqual([]);
    expect(result.total).toBe(0);
    expect(queryBuilder.getManyAndCount).not.toHaveBeenCalled();
  });
});
