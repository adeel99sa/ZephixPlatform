import { ForbiddenException } from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';

describe('project membership-change contract', () => {
  const baseProject = {
    id: 'proj-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    deletedAt: null,
    projectManagerId: null,
    deliveryOwnerUserId: null,
  };

  function makeService(options?: {
    canAccessWorkspace?: boolean;
    workspaceRole?: string | null;
    project?: any;
  }) {
    const workspaceAccessService = {
      canAccessWorkspace: jest
        .fn()
        .mockResolvedValue(options?.canAccessWorkspace ?? true),
      getUserWorkspaceRole: jest
        .fn()
        .mockResolvedValue(
          options?.workspaceRole === undefined
            ? 'workspace_member'
            : options.workspaceRole,
        ),
    };

    const service = new ProjectsService(
      { createQueryBuilder: jest.fn(), count: jest.fn(), findOne: jest.fn() } as any,
      { findOne: jest.fn() } as any,
      { findOne: jest.fn() } as any,
      {} as any,
      {} as any,
      { assertOrganizationId: jest.fn().mockReturnValue('org-1') } as any,
      {} as any,
      workspaceAccessService as any,
      { assertWithinLimit: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    (service as any).findById = jest
      .fn()
      .mockResolvedValue(options?.project ?? { ...baseProject });

    return { service, workspaceAccessService };
  }

  it('denies project read after access is revoked', async () => {
    const { service, workspaceAccessService } = makeService({
      workspaceRole: 'workspace_member',
    });
    workspaceAccessService.canAccessWorkspace
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-member', 'MEMBER'),
    ).resolves.toBeTruthy();

    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-member', 'MEMBER'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('project-only grant shows workspace container behavior and only shared project', async () => {
    const { service } = makeService({
      workspaceRole: null,
      canAccessWorkspace: true,
      project: { ...baseProject, projectManagerId: 'u-project-only' },
    });

    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-project-only', 'MEMBER'),
    ).resolves.toBeTruthy();
  });

  it('project-only revoke denies previously shared project', async () => {
    const { service } = makeService({
      workspaceRole: null,
      canAccessWorkspace: true,
      project: { ...baseProject, projectManagerId: 'u-project-only' },
    });

    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-project-only', 'MEMBER'),
    ).resolves.toBeTruthy();

    (service as any).findById.mockResolvedValueOnce({
      ...baseProject,
      projectManagerId: 'another-user',
      deliveryOwnerUserId: null,
    });

    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-project-only', 'MEMBER'),
    ).rejects.toThrow(ForbiddenException);
  });
});
