/**
 * Phase 3D: Audit CSV Export Tests
 */
import { AuditController } from '../controllers/audit.controller';

describe('AuditController.exportAuditCsv', () => {
  let controller: AuditController;
  let mockAuditService: any;
  let mockWorkspaceRoleGuard: any;

  const adminReq = (orgId = 'org-1') =>
    ({
      user: { id: 'user-1', organizationId: orgId, platformRole: 'ADMIN' },
      id: 'req-123',
    }) as any;

  const memberReq = () =>
    ({
      user: { id: 'user-2', organizationId: 'org-1', platformRole: 'MEMBER' },
      id: 'req-456',
    }) as any;

  beforeEach(() => {
    mockAuditService = {
      query: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    mockWorkspaceRoleGuard = {
      getWorkspaceRole: jest.fn().mockResolvedValue(null),
    };
    controller = new AuditController(mockAuditService, mockWorkspaceRoleGuard);
  });

  it('blocks non-ADMIN users', async () => {
    const res = { setHeader: jest.fn(), write: jest.fn(), end: jest.fn() };
    await expect(
      controller.exportAuditCsv(memberReq(), res as any),
    ).rejects.toThrow('Audit export requires platform ADMIN role');
  });

  it('rejects export window > 90 days', async () => {
    const res = { setHeader: jest.fn(), write: jest.fn(), end: jest.fn() };
    await expect(
      controller.exportAuditCsv(
        adminReq(),
        res as any,
        '2025-01-01',
        '2025-06-01',
      ),
    ).rejects.toThrow('Export window cannot exceed 90 days');
  });

  it('rejects invalid date format', async () => {
    const res = { setHeader: jest.fn(), write: jest.fn(), end: jest.fn() };
    await expect(
      controller.exportAuditCsv(adminReq(), res as any, 'not-a-date', '2025-01-01'),
    ).rejects.toThrow('Invalid date format');
  });

  it('rejects from > to', async () => {
    const res = { setHeader: jest.fn(), write: jest.fn(), end: jest.fn() };
    await expect(
      controller.exportAuditCsv(adminReq(), res as any, '2025-06-01', '2025-01-01'),
    ).rejects.toThrow('from date must be before to date');
  });

  it('streams CSV header and rows for ADMIN', async () => {
    const written: string[] = [];
    const res = {
      setHeader: jest.fn(),
      write: jest.fn((chunk: string) => written.push(chunk)),
      end: jest.fn(),
    };

    mockAuditService.query.mockResolvedValueOnce({
      items: [
        {
          id: 'evt-1',
          createdAt: new Date('2025-03-01'),
          organizationId: 'org-1',
          workspaceId: 'ws-1',
          actorUserId: 'user-1',
          actorPlatformRole: 'ADMIN',
          entityType: 'project',
          entityId: 'proj-1',
          action: 'create',
          metadataJson: { key: 'value' },
        },
      ],
      total: 1,
    });

    await controller.exportAuditCsv(adminReq(), res as any, '2025-03-01', '2025-03-30');

    // CSV header
    expect(written[0]).toContain('id,created_at,organization_id');

    // Data row
    expect(written.length).toBeGreaterThan(1);
    expect(written[1]).toContain('evt-1');
    expect(written[1]).toContain('org-1');
    expect(written[1]).toContain('project');
    expect(written[1]).toContain('create');

    expect(res.end).toHaveBeenCalled();
  });

  it('sets Content-Type to text/csv', async () => {
    const res = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };
    await controller.exportAuditCsv(adminReq(), res as any, '2025-03-01', '2025-03-30');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
  });

  it('sets Content-Disposition with date range filename', async () => {
    const res = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };
    await controller.exportAuditCsv(adminReq(), res as any, '2025-03-01', '2025-03-30');
    const calls = res.setHeader.mock.calls;
    const dispositionCall = calls.find((c: any[]) => c[0] === 'Content-Disposition');
    expect(dispositionCall).toBeDefined();
    expect(dispositionCall![1]).toContain('audit-export');
    expect(dispositionCall![1]).toContain('.csv');
  });

  it('paginates through multiple pages', async () => {
    const items = Array.from({ length: 500 }, (_, i) => ({
      id: `evt-${i}`,
      createdAt: new Date('2025-03-01'),
      organizationId: 'org-1',
      workspaceId: null,
      actorUserId: 'user-1',
      actorPlatformRole: 'ADMIN',
      entityType: 'project',
      entityId: `proj-${i}`,
      action: 'create',
      metadataJson: null,
    }));

    mockAuditService.query
      .mockResolvedValueOnce({ items, total: 600 })
      .mockResolvedValueOnce({ items: items.slice(0, 100), total: 600 })
      .mockResolvedValueOnce({ items: [], total: 600 });

    const res = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };

    await controller.exportAuditCsv(adminReq(), res as any, '2025-03-01', '2025-03-30');

    // Should have made multiple query calls (paginated)
    expect(mockAuditService.query.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(res.end).toHaveBeenCalled();
  });
});
