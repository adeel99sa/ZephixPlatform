/**
 * Phase 3D: MetricsController Tests
 */
import { MetricsController } from '../metrics.controller';

describe('MetricsController', () => {
  let controller: MetricsController;
  let mockDataSource: any;

  const makeReq = (role: string, orgId = 'org-1') =>
    ({
      user: { id: 'user-1', organizationId: orgId, platformRole: role },
    }) as any;

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn().mockResolvedValue([{ cnt: 5 }]),
    };
    controller = new MetricsController(mockDataSource);
  });

  it('returns metrics for ADMIN user', async () => {
    mockDataSource.query
      .mockResolvedValueOnce([{ cnt: 1 }])   // org count
      .mockResolvedValueOnce([{ cnt: 10 }])  // user count
      .mockResolvedValueOnce([{ cnt: 5 }])   // project count
      .mockResolvedValueOnce([{ cnt: 2 }])   // portfolio count
      .mockResolvedValueOnce([{ cnt: 20 }])  // attachment count
      .mockResolvedValueOnce([{ total: '1000000' }]) // storage
      .mockResolvedValueOnce([{ cnt: 100 }]); // audit events

    const result = await controller.getSystemMetrics(makeReq('ADMIN'));
    expect(result.data).toBeDefined();
    expect(result.data.counts).toBeDefined();
    expect(result.data.counts.organizations).toBe(1);
    expect(result.data.counts.projects).toBe(5);
    expect(result.data.storage).toBeDefined();
    expect(result.data.system.uptimeSeconds).toBeDefined();
    expect(result.data.system.nodeVersion).toBeDefined();
    expect(result.data.timestamp).toBeDefined();
  });

  it('blocks MEMBER from accessing metrics', async () => {
    const result = await controller.getSystemMetrics(makeReq('MEMBER'));
    expect(result.code).toBe('AUTH_FORBIDDEN');
  });

  it('blocks VIEWER from accessing metrics', async () => {
    const result = await controller.getSystemMetrics(makeReq('VIEWER'));
    expect(result.code).toBe('AUTH_FORBIDDEN');
  });

  it('handles individual query failures gracefully with zeroes', async () => {
    // Individual countTable calls catch internally and return 0
    mockDataSource.query.mockRejectedValue(new Error('DB down'));
    const result = await controller.getSystemMetrics(makeReq('ADMIN'));
    // Since all queries fail internally and return 0, we still get a valid response
    expect(result.data).toBeDefined();
    expect(result.data.counts.organizations).toBe(0);
    expect(result.data.storage.totalUsedBytes).toBe(0);
  });

  it('scopes all queries by organizationId', async () => {
    await controller.getSystemMetrics(makeReq('ADMIN', 'org-99'));
    // All queries should have been called with org-99
    for (const call of mockDataSource.query.mock.calls) {
      if (call[1]) {
        expect(call[1]).toContain('org-99');
      }
    }
  });
});
