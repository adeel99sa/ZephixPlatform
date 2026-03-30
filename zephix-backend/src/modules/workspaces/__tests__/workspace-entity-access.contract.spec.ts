import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspacesController } from '../workspaces.controller';

describe('workspace entity access contract', () => {
  const makeController = (canAccess: boolean) => {
    const getWorkspaceForReadOrThrow = canAccess
      ? jest.fn().mockResolvedValue({
          id: 'ws-1',
          name: 'Workspace One',
          organizationId: 'org-1',
        })
      : jest
          .fn()
          .mockRejectedValue(new ForbiddenException('Workspace access denied'));
    const svc = {
      getWorkspaceForReadOrThrow,
    };
    const accessService = {
      canAccessWorkspace: jest.fn().mockResolvedValue(canAccess),
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

    return { controller, svc, accessService };
  };

  it('allows workspace member on GET /workspaces/:id', async () => {
    const { controller } = makeController(true);
    const res = await controller.get('ws-1', {
      id: 'u-member',
      organizationId: 'org-1',
      role: 'member',
    } as any, { headers: {} } as any);
    expect((res as any).data?.id).toBe('ws-1');
  });

  it('allows project-only user to workspace container on GET /workspaces/:id', async () => {
    const { controller } = makeController(true);
    const res = await controller.get('ws-1', {
      id: 'u-project-only',
      organizationId: 'org-1',
      role: 'member',
    } as any, { headers: {} } as any);
    expect((res as any).data?.id).toBe('ws-1');
  });

  it('denies project-only user after project unshare removes container access', async () => {
    const { controller } = makeController(false);
    await expect(
      controller.get(
        'ws-1',
        { id: 'u-project-only', organizationId: 'org-1', role: 'member' } as any,
        { headers: {} } as any,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows viewer with valid membership on GET /workspaces/:id', async () => {
    const { controller } = makeController(true);
    const res = await controller.get('ws-1', {
      id: 'u-viewer',
      organizationId: 'org-1',
      role: 'guest',
    } as any, { headers: {} } as any);
    expect((res as any).data?.id).toBe('ws-1');
  });

  it('denies unauthorized user on GET /workspaces/:id', async () => {
    const { controller } = makeController(false);
    await expect(
      controller.get(
        'ws-1',
        { id: 'u-none', organizationId: 'org-1', role: 'member' } as any,
        { headers: {} } as any,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns not found for missing workspace entity', async () => {
    const { controller, svc } = makeController(true);
    (svc.getWorkspaceForReadOrThrow as jest.Mock).mockRejectedValueOnce(
      new NotFoundException('Workspace not found'),
    );
    await expect(
      controller.get(
        'ws-missing',
        { id: 'u-member', organizationId: 'org-1', role: 'member' } as any,
        { headers: {} } as any,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
