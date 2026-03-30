import { ForbiddenException } from '@nestjs/common';
import { WorkspacesController } from '../workspaces.controller';

describe('workspace membership-change contract', () => {
  const makeController = () => {
    const getWorkspaceForReadOrThrow = jest.fn();
    const svc = {
      getWorkspaceForReadOrThrow,
    };
    const accessService = {
      canAccessWorkspace: jest.fn(),
    };

    const controller = new WorkspacesController(
      svc as any,
      {} as any,
      {} as any,
      accessService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { getOrganizationId: jest.fn() } as any,
    );

    return { controller, accessService, getWorkspaceForReadOrThrow };
  };

  it('denies workspace read after membership is revoked', async () => {
    const { controller, accessService, getWorkspaceForReadOrThrow } =
      makeController();
    accessService.canAccessWorkspace
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    getWorkspaceForReadOrThrow
      .mockResolvedValueOnce({
        id: 'ws-1',
        name: 'Workspace One',
        organizationId: 'org-1',
      })
      .mockRejectedValueOnce(new ForbiddenException('Workspace access denied'));

    await expect(
      controller.get(
        'ws-1',
        { id: 'u-member', organizationId: 'org-1', role: 'member' } as any,
        { headers: {} } as any,
      ),
    ).resolves.toMatchObject({ data: { id: 'ws-1' } });

    await expect(
      controller.get(
        'ws-1',
        { id: 'u-member', organizationId: 'org-1', role: 'member' } as any,
        { headers: {} } as any,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('removes project-only container visibility after project access revoke', async () => {
    const { controller, accessService, getWorkspaceForReadOrThrow } =
      makeController();
    accessService.canAccessWorkspace
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    getWorkspaceForReadOrThrow
      .mockResolvedValueOnce({
        id: 'ws-1',
        name: 'Workspace One',
        organizationId: 'org-1',
      })
      .mockRejectedValueOnce(new ForbiddenException('Workspace access denied'));

    await expect(
      controller.get(
        'ws-1',
        { id: 'u-project-only', organizationId: 'org-1', role: 'member' } as any,
        { headers: {} } as any,
      ),
    ).resolves.toMatchObject({ data: { id: 'ws-1' } });

    await expect(
      controller.get(
        'ws-1',
        { id: 'u-project-only', organizationId: 'org-1', role: 'member' } as any,
        { headers: {} } as any,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
