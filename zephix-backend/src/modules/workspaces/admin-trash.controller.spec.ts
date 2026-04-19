import { AdminTrashController } from './admin-trash.controller';

describe('AdminTrashController', () => {
  it('listTrash delegates without legacy enforceDelete (AdminOnlyGuard covers auth)', async () => {
    const workspacesService = {
      listTrash: jest.fn().mockResolvedValue([{ id: 'w1', name: 'W' }]),
    };

    const controller = new AdminTrashController(workspacesService as any);

    const result = await controller.listTrash('workspace', {
      id: 'admin-1',
      organizationId: 'org-1',
      role: 'user' as any,
    } as any);

    expect(workspacesService.listTrash).toHaveBeenCalledWith('org-1', 'workspace');
    expect(result).toEqual([{ id: 'w1', name: 'W' }]);
  });

  it('purge with id delegates to workspacesService.purge', async () => {
    const workspacesService = {
      purge: jest.fn().mockResolvedValue({ id: 'ws-1' }),
      purgeOldTrash: jest.fn(),
    };

    const controller = new AdminTrashController(workspacesService as any);

    const result = await controller.purge(
      { id: 'ws-1' },
      { id: 'u1', organizationId: 'org-1', role: 'admin' } as any,
    );

    expect(workspacesService.purge).toHaveBeenCalledWith('ws-1');
    expect(workspacesService.purgeOldTrash).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'ws-1' });
  });

  it('purge with days delegates to purgeOldTrash', async () => {
    const workspacesService = {
      purge: jest.fn(),
      purgeOldTrash: jest.fn().mockResolvedValue(undefined),
    };

    const controller = new AdminTrashController(workspacesService as any);

    await controller.purge(
      { days: 30 },
      { id: 'u1', organizationId: 'org-1', role: 'admin' } as any,
    );

    expect(workspacesService.purgeOldTrash).toHaveBeenCalledWith(30);
    expect(workspacesService.purge).not.toHaveBeenCalled();
  });
});
