import { DashboardVisibility } from '../entities/dashboard.entity';
import { OperationalDashboardService } from '../services/operational-dashboard.service';
import { DashboardCardRegistryService } from '../services/dashboard-card-registry.service';

describe('dashboard home contract', () => {
  it('home dashboard resolves personal-scope cards deterministically', async () => {
    const dashboardRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'home-1',
        organizationId: 'org-1',
        ownerUserId: 'user-1',
        visibility: DashboardVisibility.PRIVATE,
        workspaceId: null,
        name: 'Home Dashboard',
        widgets: [
          {
            id: 'widget-a',
            widgetKey: 'my_tasks_today',
            title: 'My Tasks Today',
            layout: { x: 0, y: 0, w: 4, h: 2 },
          },
          {
            id: 'widget-b',
            widgetKey: 'overdue_tasks',
            title: 'Overdue Tasks',
            layout: { x: 4, y: 0, w: 4, h: 2 },
          },
        ],
      }),
      save: jest.fn(),
      create: jest.fn((v) => v),
    } as any;
    const widgetRepository = {
      save: jest.fn(),
      create: jest.fn((v) => v),
      delete: jest.fn(),
    } as any;
    const registry = new DashboardCardRegistryService();
    const resolverService = {
      resolveCardData: jest
        .fn()
        .mockImplementation(async ({ cardKey, scopeType, scopeId }) => ({
          cardKey,
          scopeType,
          scopeId,
          summary: { primaryValue: 1 },
          displayData: {},
          drilldown: { route: '/my-tasks' },
          generatedFromTimestamp: '2026-03-11T00:00:00.000Z',
        })),
    } as any;
    const workspaceAccessService = {
      canAccessWorkspace: jest.fn(),
    } as any;

    const service = new OperationalDashboardService(
      dashboardRepository,
      widgetRepository,
      registry,
      resolverService,
      workspaceAccessService,
    );

    const first = await service.getHomeDashboard({
      organizationId: 'org-1',
      userId: 'user-1',
      platformRole: 'MEMBER',
    });
    const second = await service.getHomeDashboard({
      organizationId: 'org-1',
      userId: 'user-1',
      platformRole: 'MEMBER',
    });

    expect(first.scopeType).toBe('home');
    expect(first.scopeId).toBe('user-1');
    expect(first.cards.map((card) => card.cardKey)).toEqual([
      'my_tasks_today',
      'overdue_tasks',
    ]);
    expect(first).toEqual(second);
    expect(resolverService.resolveCardData).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeType: 'home',
        scopeId: 'user-1',
      }),
    );
  });
});

