import { DashboardCardRegistryService } from '../services/dashboard-card-registry.service';

describe('dashboard catalog contract', () => {
  it('returns grouped card catalog for workspace scope', () => {
    const service = new DashboardCardRegistryService();
    const catalog = service.getCatalogGroupedByCategory('workspace');

    expect(catalog.featured).toEqual([]);
    expect(catalog.tasks.map((item) => item.cardKey)).toContain('overdue_tasks');
    expect(catalog['project-health'].map((item) => item.cardKey)).toContain(
      'projects_at_risk',
    );
    expect(catalog.resources.map((item) => item.cardKey)).toContain(
      'resource_capacity',
    );
    expect(catalog.governance.map((item) => item.cardKey)).toContain('active_risks');
  });
});

