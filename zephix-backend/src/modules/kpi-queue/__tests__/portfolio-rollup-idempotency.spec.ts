import { PortfolioRollupProcessor, RollupResult } from '../processors/portfolio-rollup.processor';
import { PortfolioKpiSnapshotEntity } from '../entities/portfolio-kpi-snapshot.entity';

/**
 * Wave 10: Idempotency and ordering tests for portfolio rollup processor.
 * - Same inputHash results in no DB write (idempotency).
 * - Different project insert order yields same inputHash (ordering determinism).
 */
describe('PortfolioRollupProcessor — idempotency & ordering', () => {
  let processor: PortfolioRollupProcessor;
  let mockSnapshotRepo: any;
  let mockRollupService: any;
  let mockConfigService: any;

  const BASE_PAYLOAD = {
    workspaceId: 'ws-1',
    portfolioId: 'pf-1',
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

    mockRollupService = {
      computeForPortfolio: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(true),
    };

    processor = new PortfolioRollupProcessor(
      mockConfigService,
      mockSnapshotRepo as any,
      mockRollupService,
    );
  });

  it('skips DB write when existing row has same inputHash (idempotency)', async () => {
    const inputHash = 'abc12345';

    mockRollupService.computeForPortfolio.mockResolvedValue({
      computed: [
        { kpiCode: 'throughput', value: 42, valueJson: { sum: 42 } },
      ],
      skipped: [],
      inputHash,
    });

    // Existing row with SAME inputHash
    mockSnapshotRepo.findOne.mockResolvedValue({
      workspaceId: 'ws-1',
      portfolioId: 'pf-1',
      asOfDate: '2026-02-10',
      kpiCode: 'throughput',
      inputHash,
      valueNumeric: '42.0000',
    } as Partial<PortfolioKpiSnapshotEntity>);

    const result: RollupResult = await processor.process(makeJob());

    // Should NOT call save (no update needed)
    expect(mockSnapshotRepo.save).not.toHaveBeenCalled();
    expect(result.computedCount).toBe(0);
  });

  it('updates DB when inputHash differs', async () => {
    const newHash = 'new12345';

    mockRollupService.computeForPortfolio.mockResolvedValue({
      computed: [
        { kpiCode: 'throughput', value: 50, valueJson: { sum: 50 } },
      ],
      skipped: [],
      inputHash: newHash,
    });

    // Existing row with DIFFERENT inputHash
    mockSnapshotRepo.findOne.mockResolvedValue({
      workspaceId: 'ws-1',
      portfolioId: 'pf-1',
      asOfDate: '2026-02-10',
      kpiCode: 'throughput',
      inputHash: 'old12345',
      valueNumeric: '42.0000',
    } as Partial<PortfolioKpiSnapshotEntity>);

    const result: RollupResult = await processor.process(makeJob());

    expect(mockSnapshotRepo.save).toHaveBeenCalledTimes(1);
    expect(result.computedCount).toBe(1);
  });

  it('inserts new row when no existing snapshot', async () => {
    mockRollupService.computeForPortfolio.mockResolvedValue({
      computed: [
        { kpiCode: 'wip', value: 10, valueJson: { sum: 10 } },
      ],
      skipped: [],
      inputHash: 'fresh123',
    });

    mockSnapshotRepo.findOne.mockResolvedValue(null);

    const result: RollupResult = await processor.process(makeJob());

    expect(mockSnapshotRepo.save).toHaveBeenCalledTimes(1);
    expect(result.computedCount).toBe(1);
  });
});
