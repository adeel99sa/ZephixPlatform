import { KpiEnqueueService } from '../services/kpi-enqueue.service';
import { KpiQueueFactoryService } from '../services/kpi-queue-factory.service';

describe('KpiEnqueueService', () => {
  let service: KpiEnqueueService;
  let mockQueue: any;
  let mockFactory: jest.Mocked<KpiQueueFactoryService>;

  beforeEach(() => {
    mockQueue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn().mockResolvedValue(null),
    };

    mockFactory = {
      getQueue: jest.fn().mockReturnValue(mockQueue),
      getConnection: jest.fn(),
      isConnected: jest.fn(),
    } as any;

    service = new KpiEnqueueService(mockFactory);
  });

  describe('Dedupe jobId generation', () => {
    it('generates deterministic jobId for PROJECT_KPI_RECOMPUTE_ALL', async () => {
      const payload = {
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-02-10',
        reason: 'TASK_UPDATED',
        correlationId: 'corr-1',
      };

      const jobId = await service.enqueueProjectRecomputeAll(payload);
      expect(jobId).toBe('pkr:ws:ws-1:p:proj-1:d:2026-02-10:all');
    });

    it('generates same jobId for same payload (dedupe)', async () => {
      const payload = {
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-02-10',
        reason: 'FIRST',
        correlationId: 'c1',
      };

      const jobId1 = await service.enqueueProjectRecomputeAll(payload);
      const jobId2 = await service.enqueueProjectRecomputeAll({ ...payload, reason: 'SECOND', correlationId: 'c2' });

      expect(jobId1).toBe(jobId2);
    });

    it('generates different jobId for different projects', async () => {
      const base = { workspaceId: 'ws-1', asOfDate: '2026-02-10', reason: 'TEST', correlationId: 'c' };

      const jobId1 = await service.enqueueProjectRecomputeAll({ ...base, projectId: 'proj-1' });
      const jobId2 = await service.enqueueProjectRecomputeAll({ ...base, projectId: 'proj-2' });

      expect(jobId1).not.toBe(jobId2);
    });

    it('generates different jobId for different dates', async () => {
      const base = { workspaceId: 'ws-1', projectId: 'proj-1', reason: 'TEST', correlationId: 'c' };

      const jobId1 = await service.enqueueProjectRecomputeAll({ ...base, asOfDate: '2026-02-10' });
      const jobId2 = await service.enqueueProjectRecomputeAll({ ...base, asOfDate: '2026-02-11' });

      expect(jobId1).not.toBe(jobId2);
    });

    it('includes hashed kpiCodes in partial recompute jobId', async () => {
      const payload = {
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-02-10',
        kpiCodes: ['wip', 'throughput'],
        reason: 'TASK_UPDATED',
        correlationId: 'c',
      };

      const jobId = await service.enqueueProjectRecompute(payload);
      expect(jobId).toMatch(/^pkr:ws:ws-1:p:proj-1:d:2026-02-10:k:[a-f0-9]{8}$/);
    });

    it('same kpiCodes in different order produce same hash', async () => {
      const base = { workspaceId: 'ws-1', projectId: 'proj-1', asOfDate: '2026-02-10', reason: 'T', correlationId: 'c' };

      const jobId1 = await service.enqueueProjectRecompute({ ...base, kpiCodes: ['wip', 'throughput'] });
      const jobId2 = await service.enqueueProjectRecompute({ ...base, kpiCodes: ['throughput', 'wip'] });

      expect(jobId1).toBe(jobId2);
    });

    it('portfolio rollup jobId is deterministic', async () => {
      const jobId = await service.enqueuePortfolioRollup({
        workspaceId: 'ws-1',
        portfolioId: 'pf-1',
        asOfDate: '2026-02-10',
        reason: 'TEST',
        correlationId: 'c',
      });

      expect(jobId).toBe('prr:ws:ws-1:pf:pf-1:d:2026-02-10');
    });

    it('program rollup jobId is deterministic', async () => {
      const jobId = await service.enqueueProgramRollup({
        workspaceId: 'ws-1',
        programId: 'pg-1',
        asOfDate: '2026-02-10',
        reason: 'TEST',
        correlationId: 'c',
      });

      expect(jobId).toBe('grr:ws:ws-1:pg:pg-1:d:2026-02-10');
    });
  });

  describe('100 emits produce 1 queued job (dedupe)', () => {
    it('passes same jobId for 100 enqueues with same params', async () => {
      const payload = {
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-02-10',
        reason: 'TASK_UPDATED',
        correlationId: 'burst',
      };

      for (let i = 0; i < 100; i++) {
        await service.enqueueProjectRecomputeAll({
          ...payload,
          correlationId: `burst-${i}`,
        });
      }

      // All 100 calls use the same jobId, so BullMQ deduplicates to 1
      expect(mockQueue.add).toHaveBeenCalledTimes(100);
      const jobIds = mockQueue.add.mock.calls.map((c: any) => c[2].jobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(1);
    });
  });

  describe('Queue unavailable', () => {
    it('returns null when queue not available', async () => {
      mockFactory.getQueue.mockReturnValue(null);

      const jobId = await service.enqueueProjectRecomputeAll({
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-02-10',
        reason: 'TEST',
        correlationId: 'c',
      });

      expect(jobId).toBeNull();
    });
  });

  describe('Delay configuration', () => {
    it('project recompute uses 30s delay', async () => {
      await service.enqueueProjectRecomputeAll({
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-02-10',
        reason: 'TEST',
        correlationId: 'c',
      });

      const opts = mockQueue.add.mock.calls[0][2];
      expect(opts.delay).toBe(30_000);
    });

    it('portfolio rollup uses 60s delay', async () => {
      await service.enqueuePortfolioRollup({
        workspaceId: 'ws-1',
        portfolioId: 'pf-1',
        asOfDate: '2026-02-10',
        reason: 'TEST',
        correlationId: 'c',
      });

      const opts = mockQueue.add.mock.calls[0][2];
      expect(opts.delay).toBe(60_000);
    });
  });
});
