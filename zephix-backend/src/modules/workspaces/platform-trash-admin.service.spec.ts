import { PlatformTrashAdminService } from './platform-trash-admin.service';

describe('PlatformTrashAdminService', () => {
  it('purgeStaleTrash runs workspace purge in tenant context and project purge', async () => {
    const workspacesService = {
      listTrashedWorkspaces: jest.fn(),
      purgeOldTrash: jest.fn().mockResolvedValue({ workspacesPurged: 3 }),
    };
    const projectsService = {
      purgeOldTrashedProjects: jest
        .fn()
        .mockResolvedValue({ projectsPurged: 5 }),
    };
    const tenantContext = {
      runWithTenant: jest.fn(async (_t: unknown, fn: () => Promise<unknown>) =>
        fn(),
      ),
    };
    const auditService = { record: jest.fn().mockResolvedValue({}) };

    const svc = new PlatformTrashAdminService(
      workspacesService as any,
      projectsService as any,
      tenantContext as any,
      auditService as any,
    );

    const result = await svc.purgeStaleTrash(
      'org-1',
      'user-1',
      30,
      'manual_http',
    );

    expect(tenantContext.runWithTenant).toHaveBeenCalledWith(
      { organizationId: 'org-1' },
      expect.any(Function),
    );
    expect(workspacesService.purgeOldTrash).toHaveBeenCalledWith(30);
    expect(projectsService.purgeOldTrashedProjects).toHaveBeenCalledWith(
      'org-1',
      30,
    );
    expect(result.ok).toBe(true);
    expect(result.workspacesPurged).toBe(3);
    expect(result.projectsPurged).toBe(5);
    expect(result.retentionDaysApplied).toBe(30);
    expect(auditService.record).toHaveBeenCalled();
  });
});
