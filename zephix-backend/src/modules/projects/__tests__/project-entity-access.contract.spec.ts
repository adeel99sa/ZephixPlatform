import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';

describe('project entity access contract', () => {
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

    const hasProjectOverride = !!options && 'project' in options;
    (service as any).findById = jest
      .fn()
      .mockResolvedValue(
        hasProjectOverride ? options?.project : { ...baseProject },
      );

    return { service };
  }

  it('allows workspace member on GET /projects/:id', async () => {
    const { service } = makeService({
      workspaceRole: 'workspace_member',
      project: { ...baseProject },
    });
    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-member', 'MEMBER'),
    ).resolves.toBeTruthy();
  });

  it('allows project-only user for directly shared project', async () => {
    const { service } = makeService({
      workspaceRole: null,
      project: { ...baseProject, projectManagerId: 'u-project-only' },
    });
    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-project-only', 'MEMBER'),
    ).resolves.toBeTruthy();
  });

  it('denies project-only user for other project in same workspace', async () => {
    const { service } = makeService({
      workspaceRole: null,
      project: { ...baseProject, projectManagerId: 'another-user' },
      canAccessWorkspace: true,
    });
    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-project-only', 'MEMBER'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('does not treat operational project assignment as project-share access', async () => {
    const { service } = makeService({
      workspaceRole: null,
      project: { ...baseProject, projectManagerId: 'different-user' },
      canAccessWorkspace: true,
    });
    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-assigned-only', 'MEMBER'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('denies previously shared user after unshare removes direct assignment', async () => {
    const { service } = makeService({
      workspaceRole: null,
      project: { ...baseProject, projectManagerId: 'u-project-only' },
      canAccessWorkspace: true,
    });

    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-project-only', 'MEMBER'),
    ).resolves.toBeTruthy();

    (service as any).findById.mockResolvedValueOnce({
      ...baseProject,
      projectManagerId: null,
      deliveryOwnerUserId: null,
    });

    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-project-only', 'MEMBER'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('denies unauthorized user on GET /projects/:id', async () => {
    const { service } = makeService({
      canAccessWorkspace: false,
      workspaceRole: null,
      project: { ...baseProject },
    });
    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-none', 'VIEWER'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows viewer with valid authorized access', async () => {
    const { service } = makeService({
      workspaceRole: 'workspace_viewer',
      project: { ...baseProject },
    });
    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-viewer', 'VIEWER'),
    ).resolves.toBeTruthy();
  });

  it('workspace membership overrides project assignment absence', async () => {
    const { service } = makeService({
      workspaceRole: 'workspace_member',
      project: {
        ...baseProject,
        projectManagerId: null,
        deliveryOwnerUserId: null,
      },
    });
    await expect(
      service.findProjectById('proj-1', 'org-1', 'u-member', 'MEMBER'),
    ).resolves.toBeTruthy();
  });

  it('returns not found for missing project entity', async () => {
    const { service } = makeService({ project: null });
    await expect(
      service.getProjectForReadOrThrow({
        id: 'proj-missing',
        organizationId: 'org-1',
        userId: 'u-member',
        userRole: 'MEMBER',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
