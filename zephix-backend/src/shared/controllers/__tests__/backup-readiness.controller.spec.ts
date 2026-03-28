/**
 * Phase 3D: BackupReadinessController Tests
 */
import { BackupReadinessController } from '../backup-readiness.controller';

describe('BackupReadinessController', () => {
  let controller: BackupReadinessController;
  let mockDataSource: any;

  const makeReq = () =>
    ({
      user: { id: 'user-1', organizationId: 'org-1', platformRole: 'ADMIN' },
    }) as any;

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn().mockResolvedValue([]),
    };
    controller = new BackupReadinessController(mockDataSource);
  });

  it('returns ready=true when all checks pass', async () => {
    mockDataSource.query
      .mockResolvedValueOnce([{ name: 'SomeMigration' }]) // migrations
      .mockResolvedValueOnce([]) // audit_events check
      .mockResolvedValueOnce([]) // plan_code check
      .mockResolvedValueOnce([{ '?column?': 1 }]) // database check
      // core tables: 8 tables
      .mockResolvedValueOnce([]) // organizations
      .mockResolvedValueOnce([]) // workspaces
      .mockResolvedValueOnce([]) // projects
      .mockResolvedValueOnce([]) // work_tasks
      .mockResolvedValueOnce([]) // portfolios
      .mockResolvedValueOnce([]) // attachments
      .mockResolvedValueOnce([]) // audit_events
      .mockResolvedValueOnce([]); // workspace_storage_usage

    const result = await controller.getBackupReadiness(makeReq());
    expect(result.data).toBeDefined();
    expect(result.data.ready).toBe(true);
    expect(result.data.checks.databaseConnected).toBe(true);
    expect(result.data.checks.auditModuleActive).toBe(true);
    expect(result.data.checks.planStatusGuardReady).toBe(true);
  });

  it('returns ready=false when database is down', async () => {
    mockDataSource.query.mockRejectedValue(new Error('DB down'));
    const result = await controller.getBackupReadiness(makeReq());
    expect(result.data.ready).toBe(false);
    expect(result.data.checks.databaseConnected).toBe(false);
  });

  it('reports storage provider configuration', async () => {
    const original = process.env.STORAGE_BUCKET;
    process.env.STORAGE_BUCKET = 'test-bucket';
    
    mockDataSource.query.mockRejectedValue(new Error('skip'));
    const result = await controller.getBackupReadiness(makeReq());
    expect(result.data.checks.storageConfigured).toBe(true);
    
    process.env.STORAGE_BUCKET = original;
  });

  it('includes timestamp in response', async () => {
    mockDataSource.query.mockRejectedValue(new Error('skip'));
    const result = await controller.getBackupReadiness(makeReq());
    expect(result.data.timestamp).toBeDefined();
  });
});
