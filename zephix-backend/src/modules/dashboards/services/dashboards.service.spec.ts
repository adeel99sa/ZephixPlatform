import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DashboardsService } from './dashboards.service';
import { Dashboard } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { NotFoundException } from '@nestjs/common';

describe('DashboardsService - share read security', () => {
  let service: DashboardsService;
  let dashboardRepo: jest.Mocked<Repository<Dashboard>>;

  const baseWidget = (overrides: Partial<DashboardWidget> = {}) =>
    ({
      id: 'widget-1',
      widgetKey: 'project_health',
      title: 'Project Health',
      layout: { x: 0, y: 1, w: 4, h: 3 },
      config: { query: 'SELECT * FROM users', template: '${secret}' },
      ...overrides,
    }) as DashboardWidget;

  const baseDashboard = (overrides: Partial<Dashboard> = {}) =>
    ({
      id: 'dashboard-1',
      name: 'Shared Dashboard',
      description: 'Public view',
      shareEnabled: true,
      shareToken: 'token-1234',
      shareExpiresAt: null,
      deletedAt: null,
      widgets: [baseWidget(), baseWidget({ id: 'widget-2', layout: { x: 0, y: 0, w: 4, h: 3 } })],
      ...overrides,
    }) as Dashboard;

  beforeEach(async () => {
    dashboardRepo = {
      findOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardsService,
        {
          provide: getRepositoryToken(Dashboard),
          useValue: dashboardRepo,
        },
        {
          provide: getRepositoryToken(DashboardWidget),
          useValue: {},
        },
        {
          provide: WorkspaceAccessService,
          useValue: {
            canAccessWorkspace: jest.fn(),
          },
        },
        {
          provide: TenantContextService,
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<DashboardsService>(DashboardsService);
  });

  it('returns sanitized shared dashboard data', async () => {
    dashboardRepo.findOne.mockResolvedValue(baseDashboard());

    const result = await service.getSharedDashboard('dashboard-1', 'token-1234');

    expect(result.id).toBe('dashboard-1');
    expect(result.widgets).toHaveLength(2);
    expect(result.widgets[0].id).toBe('widget-2'); // sorted by layout.y then x
    expect(result.widgets[0].config).toEqual({});
    expect(result.widgets[1].config).toEqual({});
  });

  it('denies invalid token (case mismatch)', async () => {
    dashboardRepo.findOne.mockResolvedValue(baseDashboard());

    await expect(
      service.getSharedDashboard('dashboard-1', 'TOKEN-1234'),
    ).rejects.toThrow(NotFoundException);
  });

  it('denies invalid token (whitespace)', async () => {
    dashboardRepo.findOne.mockResolvedValue(baseDashboard());

    await expect(
      service.getSharedDashboard('dashboard-1', 'token-1234 '),
    ).rejects.toThrow(NotFoundException);
  });

  it('denies when sharing is disabled', async () => {
    dashboardRepo.findOne.mockResolvedValue(
      baseDashboard({ shareEnabled: false }),
    );

    await expect(
      service.getSharedDashboard('dashboard-1', 'token-1234'),
    ).rejects.toThrow(NotFoundException);
  });

  it('denies when share is expired', async () => {
    dashboardRepo.findOne.mockResolvedValue(
      baseDashboard({ shareExpiresAt: new Date(Date.now() - 60_000) }),
    );

    await expect(
      service.getSharedDashboard('dashboard-1', 'token-1234'),
    ).rejects.toThrow(NotFoundException);
  });

  it('denies deleted dashboards', async () => {
    dashboardRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getSharedDashboard('dashboard-1', 'token-1234'),
    ).rejects.toThrow(NotFoundException);
  });

  it('logs warning when widget allowlist is missing', async () => {
    const logger = (service as any).logger;
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);

    dashboardRepo.findOne.mockResolvedValue(
      baseDashboard({
        widgets: [baseWidget({ widgetKey: 'unknown_widget' })],
      }),
    );

    const result = await service.getSharedDashboard('dashboard-1', 'token-1234');

    expect(result.widgets[0].config).toEqual({});
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('allowlist missing'),
    );
  });
});
