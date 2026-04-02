import { UnauthorizedException } from '@nestjs/common';
import { DashboardVisibility } from '../entities/dashboard.entity';
import { WorkspaceDashboardsController } from './workspace-dashboards.controller';

describe('WorkspaceDashboardsController', () => {
  const dashboardsService = {
    listDashboards: jest.fn(),
    createDashboard: jest.fn(),
  } as any;
  const responseService = {
    success: jest.fn((data: unknown) => data),
  } as any;

  const controller = new WorkspaceDashboardsController(
    dashboardsService,
    responseService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists dashboards with organization and workspace scope', async () => {
    dashboardsService.listDashboards.mockResolvedValue([{ id: 'd-1' }]);

    const req = {
      user: {
        id: 'user-1',
        organizationId: 'org-1',
        platformRole: 'ADMIN',
      },
    } as any;

    await controller.listByWorkspace('ws-1', req);

    expect(dashboardsService.listDashboards).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'ADMIN',
      'ws-1',
    );
    expect(responseService.success).toHaveBeenCalled();
  });

  it('creates workspace dashboard with enforced workspace visibility default', async () => {
    dashboardsService.createDashboard.mockResolvedValue({ id: 'd-1' });
    const req = {
      user: {
        id: 'user-1',
        organizationId: 'org-1',
      },
    } as any;

    await controller.createInWorkspace('ws-1', { name: 'Ops' } as any, req);

    expect(dashboardsService.createDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ops',
        workspaceId: 'ws-1',
        visibility: DashboardVisibility.WORKSPACE,
      }),
      'org-1',
      'user-1',
      'ws-1',
    );
  });

  it('rejects missing auth context', async () => {
    const req = { user: { userId: 'user-1' } } as any;

    await expect(controller.listByWorkspace('ws-1', req)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
