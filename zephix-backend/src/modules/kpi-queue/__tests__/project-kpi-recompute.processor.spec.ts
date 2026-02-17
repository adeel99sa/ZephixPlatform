import { ProjectKpiRecomputeProcessor } from '../processors/project-kpi-recompute.processor';
import { ConfigService } from '@nestjs/config';

describe('ProjectKpiRecomputeProcessor', () => {
  let processor: ProjectKpiRecomputeProcessor;
  let mockConfig: jest.Mocked<ConfigService>;
  let mockProjectRepo: any;
  let mockComputeService: any;
  let mockEnqueue: any;

  beforeEach(() => {
    mockConfig = { get: jest.fn() } as any;
    mockProjectRepo = {
      findOne: jest.fn(),
    };
    mockComputeService = {
      computeForProject: jest.fn().mockResolvedValue({
        computed: [{ id: 'v1' }, { id: 'v2' }],
        skipped: [],
      }),
    };
    mockEnqueue = {
      enqueuePortfolioRollup: jest.fn().mockResolvedValue('rollup-job-1'),
      enqueueProgramRollup: jest.fn().mockResolvedValue('rollup-job-2'),
    };

    processor = new ProjectKpiRecomputeProcessor(
      mockConfig,
      mockProjectRepo,
      mockComputeService,
      mockEnqueue,
    );
  });

  const makeJob = (data: any) => ({
    id: 'test-job',
    data,
    moveToDelayed: jest.fn(),
  });

  it('returns no-op when feature flag is disabled', async () => {
    mockConfig.get.mockReturnValue(false);

    const result = await processor.process(
      makeJob({
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-02-10',
        reason: 'TEST',
        correlationId: 'c',
      }) as any,
    );

    expect(result.computedCount).toBe(0);
    expect(mockComputeService.computeForProject).not.toHaveBeenCalled();
  });

  it('computes KPIs when flag is enabled and project exists', async () => {
    mockConfig.get.mockReturnValue(true);
    mockProjectRepo.findOne.mockResolvedValue({
      id: 'proj-1',
      portfolioId: null,
      programId: null,
    });

    const result = await processor.process(
      makeJob({
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-02-10',
        reason: 'TASK_UPDATED',
        correlationId: 'c',
      }) as any,
    );

    expect(result.computedCount).toBe(2);
    expect(mockComputeService.computeForProject).toHaveBeenCalledWith('ws-1', 'proj-1');
  });

  it('enqueues portfolio rollup when project has portfolioId', async () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'features.kpiAsyncRecomputeEnabled') return true;
      if (key === 'features.portfolioKpiSnapshotsEnabled') return true;
      return false;
    });

    mockProjectRepo.findOne.mockResolvedValue({
      id: 'proj-1',
      portfolioId: 'pf-1',
      programId: null,
    });

    const result = await processor.process(
      makeJob({
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-02-10',
        reason: 'TEST',
        correlationId: 'c',
      }) as any,
    );

    expect(mockEnqueue.enqueuePortfolioRollup).toHaveBeenCalledWith(
      expect.objectContaining({ portfolioId: 'pf-1' }),
    );
    expect(result.rollupsEnqueued).toContain('rollup-job-1');
  });

  it('enqueues program rollup when project has programId', async () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'features.kpiAsyncRecomputeEnabled') return true;
      if (key === 'features.programKpiSnapshotsEnabled') return true;
      return false;
    });

    mockProjectRepo.findOne.mockResolvedValue({
      id: 'proj-1',
      portfolioId: null,
      programId: 'pg-1',
    });

    const result = await processor.process(
      makeJob({
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-02-10',
        reason: 'TEST',
        correlationId: 'c',
      }) as any,
    );

    expect(mockEnqueue.enqueueProgramRollup).toHaveBeenCalledWith(
      expect.objectContaining({ programId: 'pg-1' }),
    );
    expect(result.rollupsEnqueued).toContain('rollup-job-2');
  });

  it('skips when project not found', async () => {
    mockConfig.get.mockReturnValue(true);
    mockProjectRepo.findOne.mockResolvedValue(null);

    const result = await processor.process(
      makeJob({
        workspaceId: 'ws-1',
        projectId: 'nonexistent',
        asOfDate: '2026-02-10',
        reason: 'TEST',
        correlationId: 'c',
      }) as any,
    );

    expect(result.computedCount).toBe(0);
    expect(mockComputeService.computeForProject).not.toHaveBeenCalled();
  });
});
