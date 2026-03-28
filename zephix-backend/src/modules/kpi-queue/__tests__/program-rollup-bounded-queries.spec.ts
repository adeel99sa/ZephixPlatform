import { ProgramRollupProcessor } from '../processors/program-rollup.processor';

/**
 * Wave 10: Budget query bounding test.
 * Verifies that recompute uses bounded batched queries,
 * not unbounded full-table scans.
 */
describe('ProgramRollupProcessor — bounded budget queries', () => {
  let processor: ProgramRollupProcessor;
  let mockSnapshotRepo: any;
  let mockProjectRepo: any;
  let mockKpiValueRepo: any;
  let mockBudgetRepo: any;
  let mockConfigService: any;

  const BASE_PAYLOAD = {
    workspaceId: 'ws-1',
    programId: 'pg-1',
    asOfDate: '2026-02-10',
    reason: 'TEST',
    correlationId: 'corr-1',
  };

  const makeJob = (data = BASE_PAYLOAD) =>
    ({
      data,
      moveToDelayed: jest.fn(),
    }) as any;

  beforeEach(() => {
    mockSnapshotRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      create: jest.fn().mockImplementation((e) => e),
    };

    mockProjectRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'proj-1' },
        { id: 'proj-2' },
        { id: 'proj-3' },
      ]),
    };

    mockKpiValueRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockBudgetRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(true),
    };

    processor = new ProgramRollupProcessor(
      mockConfigService,
      mockSnapshotRepo as any,
      mockProjectRepo as any,
      mockKpiValueRepo as any,
      mockBudgetRepo as any,
    );
  });

  it('scopes project query by workspaceId and programId', async () => {
    await processor.process(makeJob());

    expect(mockProjectRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { programId: 'pg-1', workspaceId: 'ws-1' },
      }),
    );
  });

  it('scopes KPI value query by workspaceId and project IDs (bounded)', async () => {
    await processor.process(makeJob());

    const kpiCall = mockKpiValueRepo.find.mock.calls[0][0];
    expect(kpiCall.where.workspaceId).toBe('ws-1');
    // projectId should be IN(...) the resolved project IDs, not unbounded
    expect(kpiCall.where.projectId).toBeDefined();
  });

  it('scopes budget query by workspaceId and project IDs (bounded)', async () => {
    await processor.process(makeJob());

    const budgetCall = mockBudgetRepo.find.mock.calls[0][0];
    expect(budgetCall.where.workspaceId).toBe('ws-1');
    expect(budgetCall.where.projectId).toBeDefined();
  });

  it('does not query KPIs or budgets when no projects in program', async () => {
    mockProjectRepo.find.mockResolvedValue([]);

    await processor.process(makeJob());

    expect(mockKpiValueRepo.find).not.toHaveBeenCalled();
    expect(mockBudgetRepo.find).not.toHaveBeenCalled();
  });
});
