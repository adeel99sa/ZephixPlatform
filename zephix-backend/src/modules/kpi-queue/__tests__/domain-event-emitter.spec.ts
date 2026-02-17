import { DomainEventEmitterService } from '../services/domain-event-emitter.service';
import { KpiEnqueueService } from '../services/kpi-enqueue.service';
import { ConfigService } from '@nestjs/config';
import { DOMAIN_EVENTS } from '../constants/queue.constants';

describe('DomainEventEmitterService', () => {
  let service: DomainEventEmitterService;
  let mockEnqueue: jest.Mocked<KpiEnqueueService>;
  let mockConfig: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockEnqueue = {
      enqueueProjectRecompute: jest.fn().mockResolvedValue('job-1'),
      enqueueProjectRecomputeAll: jest.fn().mockResolvedValue('job-2'),
      enqueuePortfolioRollup: jest.fn().mockResolvedValue('job-3'),
      enqueueProgramRollup: jest.fn().mockResolvedValue('job-4'),
    } as any;

    mockConfig = {
      get: jest.fn().mockReturnValue(true),
    } as any;

    service = new DomainEventEmitterService(mockEnqueue, mockConfig);
  });

  describe('Feature flag gating', () => {
    it('skips emit when KPI_ASYNC_RECOMPUTE_ENABLED is false', async () => {
      mockConfig.get.mockReturnValue(false);

      await service.emit(DOMAIN_EVENTS.TASK_UPDATED, {
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
      });

      expect(mockEnqueue.enqueueProjectRecompute).not.toHaveBeenCalled();
    });

    it('emits when KPI_ASYNC_RECOMPUTE_ENABLED is true', async () => {
      await service.emit(DOMAIN_EVENTS.TASK_UPDATED, {
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
      });

      expect(mockEnqueue.enqueueProjectRecompute).toHaveBeenCalled();
    });
  });

  describe('Event-to-KPI mapping', () => {
    it('TASK_STATUS_CHANGED maps to throughput, wip, cycle_time, escaped_defects, velocity', async () => {
      await service.emit(DOMAIN_EVENTS.TASK_STATUS_CHANGED, {
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
      });

      const call = mockEnqueue.enqueueProjectRecompute.mock.calls[0][0];
      expect(call.kpiCodes).toEqual(
        expect.arrayContaining(['throughput', 'wip', 'cycle_time', 'escaped_defects', 'velocity']),
      );
    });

    it('BUDGET_UPDATED maps to budget_burn, forecast_at_completion', async () => {
      await service.emit(DOMAIN_EVENTS.BUDGET_UPDATED, {
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
      });

      const call = mockEnqueue.enqueueProjectRecompute.mock.calls[0][0];
      expect(call.kpiCodes).toEqual(['budget_burn', 'forecast_at_completion']);
    });

    it('RISK_CREATED maps to open_risk_count', async () => {
      await service.emit(DOMAIN_EVENTS.RISK_CREATED, {
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
      });

      const call = mockEnqueue.enqueueProjectRecompute.mock.calls[0][0];
      expect(call.kpiCodes).toEqual(['open_risk_count']);
    });
  });

  describe('Portfolio and program events', () => {
    it('PROJECT_ASSIGNED_TO_PORTFOLIO triggers portfolio rollup', async () => {
      await service.emit(DOMAIN_EVENTS.PROJECT_ASSIGNED_TO_PORTFOLIO, {
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
        portfolioId: 'pf-1',
      });

      expect(mockEnqueue.enqueuePortfolioRollup).toHaveBeenCalledWith(
        expect.objectContaining({ portfolioId: 'pf-1' }),
      );
    });

    it('PROJECT_ASSIGNED_TO_PROGRAM triggers program rollup', async () => {
      await service.emit(DOMAIN_EVENTS.PROJECT_ASSIGNED_TO_PROGRAM, {
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
        programId: 'pg-1',
      });

      expect(mockEnqueue.enqueueProgramRollup).toHaveBeenCalledWith(
        expect.objectContaining({ programId: 'pg-1' }),
      );
    });

    it('does not trigger portfolio rollup if portfolioId is missing', async () => {
      await service.emit(DOMAIN_EVENTS.PROJECT_ASSIGNED_TO_PORTFOLIO, {
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
      });

      expect(mockEnqueue.enqueuePortfolioRollup).not.toHaveBeenCalled();
    });
  });

  describe('Correlation ID', () => {
    it('uses provided correlationId', async () => {
      await service.emit(
        DOMAIN_EVENTS.TASK_UPDATED,
        { workspaceId: 'ws-1', organizationId: 'org-1', projectId: 'proj-1' },
        'custom-corr-id',
      );

      const call = mockEnqueue.enqueueProjectRecompute.mock.calls[0][0];
      expect(call.correlationId).toBe('custom-corr-id');
    });

    it('generates correlationId when not provided', async () => {
      await service.emit(DOMAIN_EVENTS.TASK_UPDATED, {
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
      });

      const call = mockEnqueue.enqueueProjectRecompute.mock.calls[0][0];
      expect(call.correlationId).toBeTruthy();
      expect(call.correlationId.length).toBeGreaterThan(0);
    });
  });
});
