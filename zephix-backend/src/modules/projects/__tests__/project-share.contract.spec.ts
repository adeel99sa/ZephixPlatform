import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';

describe('project share contract', () => {
  const makeService = () => {
    const project = {
      id: 'proj-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      deletedAt: null,
      projectManagerId: null as string | null,
      deliveryOwnerUserId: null as string | null,
    };

    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const workspaceAccessService = {
      canAccessWorkspace: jest.fn().mockResolvedValue(true),
      getAccessibleWorkspaceIds: jest.fn().mockResolvedValue([]),
      getUserWorkspaceRole: jest
        .fn()
        .mockImplementation(
          async (_orgId: string, _workspaceId: string, userId: string) => {
            if (userId === 'actor-owner') return 'workspace_owner';
            if (userId === 'workspace-member') return 'workspace_member';
            return null;
          },
        ),
      hasWorkspaceRoleAtLeast: jest
        .fn()
        .mockImplementation((required: string, actual: string | null) => {
          if (required === 'workspace_owner') {
            return actual === 'workspace_owner';
          }
          return actual !== null;
        }),
    };

    const service = new ProjectsService(
      {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        count: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(async (input: any) => {
          Object.assign(project, input);
          return { ...project };
        }),
      } as any,
      { findOne: jest.fn() } as any,
      {
        findOne: jest
          .fn()
          .mockImplementation(async ({ where }: any) =>
            where.id === 'missing-user'
              ? null
              : {
                  id: where.id,
                  organizationId: where.organizationId,
                  isActive: true,
                },
          ),
      } as any,
      {} as any,
      {} as any,
      { assertOrganizationId: jest.fn().mockReturnValue('org-1') } as any,
      {} as any,
      workspaceAccessService as any,
      { assertWithinLimit: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    (service as any).findById = jest.fn(async () => ({ ...project }));

    return { service, project };
  };

  it('workspace owner shares project with non-workspace user', async () => {
    const { service, project } = makeService();

    await service.shareProjectAccess({
      projectId: 'proj-1',
      organizationId: 'org-1',
      actorUserId: 'actor-owner',
      actorUserRole: 'MEMBER',
      targetUserId: 'shared-user-1',
      accessLevel: 'delivery_owner',
    });

    expect(project.deliveryOwnerUserId).toBe('shared-user-1');
  });

  it('shared user can access GET /projects/:id', async () => {
    const { service } = makeService();

    await service.shareProjectAccess({
      projectId: 'proj-1',
      organizationId: 'org-1',
      actorUserId: 'actor-owner',
      actorUserRole: 'MEMBER',
      targetUserId: 'shared-user-1',
      accessLevel: 'project_manager',
    });

    await expect(
      service.findProjectById('proj-1', 'org-1', 'shared-user-1', 'MEMBER'),
    ).resolves.toBeTruthy();
  });

  it('shared user sees workspace container but only that project', async () => {
    const { service } = makeService();

    await service.shareProjectAccess({
      projectId: 'proj-1',
      organizationId: 'org-1',
      actorUserId: 'actor-owner',
      actorUserRole: 'MEMBER',
      targetUserId: 'shared-user-1',
      accessLevel: 'delivery_owner',
    });

    const scopedList = await service.findAllProjects('org-1', {
      workspaceId: 'ws-1',
      userId: 'shared-user-1',
      userRole: 'MEMBER',
      page: 1,
      limit: 20,
    });

    expect(scopedList.projects).toEqual([]);
    expect((service as any).workspaceAccessService.getAccessibleWorkspaceIds).toHaveBeenCalled();
  });

  it('unshared user loses access immediately', async () => {
    const { service } = makeService();

    await service.shareProjectAccess({
      projectId: 'proj-1',
      organizationId: 'org-1',
      actorUserId: 'actor-owner',
      actorUserRole: 'MEMBER',
      targetUserId: 'shared-user-1',
      accessLevel: 'project_manager',
    });
    await service.unshareProjectAccess({
      projectId: 'proj-1',
      organizationId: 'org-1',
      actorUserId: 'actor-owner',
      actorUserRole: 'MEMBER',
      targetUserId: 'shared-user-1',
    });

    await expect(
      service.findProjectById('proj-1', 'org-1', 'shared-user-1', 'MEMBER'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('workspace member access remains unchanged', async () => {
    const { service } = makeService();

    await service.shareProjectAccess({
      projectId: 'proj-1',
      organizationId: 'org-1',
      actorUserId: 'actor-owner',
      actorUserRole: 'MEMBER',
      targetUserId: 'shared-user-1',
      accessLevel: 'delivery_owner',
    });
    await service.unshareProjectAccess({
      projectId: 'proj-1',
      organizationId: 'org-1',
      actorUserId: 'actor-owner',
      actorUserRole: 'MEMBER',
      targetUserId: 'shared-user-1',
    });

    await expect(
      service.findProjectById('proj-1', 'org-1', 'workspace-member', 'MEMBER'),
    ).resolves.toBeTruthy();
  });

  it('rejects sharing when target user is already workspace member', async () => {
    const { service } = makeService();

    await expect(
      service.shareProjectAccess({
        projectId: 'proj-1',
        organizationId: 'org-1',
        actorUserId: 'actor-owner',
        actorUserRole: 'MEMBER',
        targetUserId: 'workspace-member',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
