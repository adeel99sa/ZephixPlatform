import { AdminTrashController } from './admin-trash.controller';

describe('AdminTrashController', () => {
  it('listTrash (paged) does not use legacy WorkspacePolicy — AdminOnlyGuard covers auth', async () => {
    const workspacesService = {};
    const projectsService = {};
    const platformTrashAdmin = {
      listTrashItemsPaged: jest.fn().mockResolvedValue({
        items: [{ id: 'p1', name: 'P', type: 'project' }],
        meta: { page: 1, limit: 25, total: 1, totalPages: 1 },
      }),
    };

    const controller = new AdminTrashController(
      workspacesService as any,
      projectsService as any,
      platformTrashAdmin as any,
    );

    const result = await controller.listTrash(
      'all',
      '1',
      '25',
      undefined,
      {
        id: 'admin-1',
        organizationId: 'org-1',
        role: 'user' as any,
        platformRole: 'ADMIN',
      } as any,
    );

    expect(platformTrashAdmin.listTrashItemsPaged).toHaveBeenCalledWith({
      organizationId: 'org-1',
      type: 'all',
      search: undefined,
      page: 1,
      limit: 25,
    });
    expect(result).toEqual({
      data: [{ id: 'p1', name: 'P', type: 'project' }],
      meta: { page: 1, limit: 25, total: 1, totalPages: 1 },
    });
  });

  it('purge with days returns symmetric purge payload', async () => {
    const workspacesService = { purge: jest.fn() };
    const projectsService = {};
    const platformTrashAdmin = {
      purgeStaleTrash: jest.fn().mockResolvedValue({
        ok: true,
        workspacesPurged: 1,
        projectsPurged: 2,
        retentionDaysApplied: 30,
        cutoffTimestamp: '2026-01-01T00:00:00.000Z',
      }),
    };

    const controller = new AdminTrashController(
      workspacesService as any,
      projectsService as any,
      platformTrashAdmin as any,
    );

    const result = await controller.purge(
      { days: 30 },
      {
        id: 'admin-1',
        organizationId: 'org-1',
        role: 'admin',
      } as any,
    );

    expect(platformTrashAdmin.purgeStaleTrash).toHaveBeenCalledWith(
      'org-1',
      'admin-1',
      30,
      'manual_http',
    );
    expect(result).toEqual({
      data: {
        ok: true,
        workspacesPurged: 1,
        projectsPurged: 2,
        retentionDaysApplied: 30,
        cutoffTimestamp: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  it('purge with id and entityType project delegates to projects service', async () => {
    const workspacesService = { purge: jest.fn() };
    const projectsService = {
      purgeTrashedProjectById: jest
        .fn()
        .mockResolvedValue({ id: 'proj-1' }),
    };
    const platformTrashAdmin = { purgeStaleTrash: jest.fn() };

    const controller = new AdminTrashController(
      workspacesService as any,
      projectsService as any,
      platformTrashAdmin as any,
    );

    const result = await controller.purge(
      { id: 'proj-1', entityType: 'project' },
      {
        id: 'admin-1',
        organizationId: 'org-1',
        role: 'admin',
      } as any,
    );

    expect(projectsService.purgeTrashedProjectById).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      'admin-1',
    );
    expect(workspacesService.purge).not.toHaveBeenCalled();
    expect(result).toEqual({ data: { id: 'proj-1' } });
  });
});
