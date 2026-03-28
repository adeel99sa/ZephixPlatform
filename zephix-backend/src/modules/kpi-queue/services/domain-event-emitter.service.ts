import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { KpiEnqueueService } from './kpi-enqueue.service';
import { DOMAIN_EVENTS, EVENT_KPI_MAP } from '../constants/queue.constants';

/**
 * Domain event payload shape. Stable interface — implementation swappable.
 */
export interface DomainEventPayload {
  workspaceId: string;
  organizationId?: string;
  projectId: string;
  entityId?: string;
  entityType?: string;
  portfolioId?: string;
  programId?: string;
  meta?: Record<string, any>;
}

/**
 * Wave 10: DomainEventEmitter — stable interface for emitting domain events.
 * Current implementation maps events to BullMQ enqueue calls.
 * Later swap to RabbitMQ or Kafka behind the same interface.
 */
@Injectable()
export class DomainEventEmitterService {
  private readonly logger = new Logger(DomainEventEmitterService.name);

  constructor(
    private readonly enqueueService: KpiEnqueueService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Emit a domain event. Maps to KPI recompute and rollup enqueues.
   */
  async emit(
    eventName: string,
    payload: DomainEventPayload,
    correlationId?: string,
  ): Promise<void> {
    const enabled = this.configService.get<boolean>('features.kpiAsyncRecomputeEnabled');
    if (!enabled) {
      this.logger.debug(`KPI async recompute disabled — skipping event ${eventName}`);
      return;
    }

    const corrId = correlationId || uuidv4();
    const asOfDate = new Date().toISOString().slice(0, 10);

    this.logger.debug(
      `Domain event: ${eventName} ws=${payload.workspaceId} proj=${payload.projectId} corr=${corrId}`,
    );

    // ── Map event to project KPI recompute ──────────────────────────────
    const kpiCodes = EVENT_KPI_MAP[eventName];
    if (kpiCodes && kpiCodes.length > 0) {
      await this.enqueueService.enqueueProjectRecompute({
        workspaceId: payload.workspaceId,
        projectId: payload.projectId,
        asOfDate,
        kpiCodes,
        reason: eventName,
        correlationId: corrId,
      });
    } else if (kpiCodes && kpiCodes.length === 0) {
      await this.enqueueService.enqueueProjectRecomputeAll({
        workspaceId: payload.workspaceId,
        projectId: payload.projectId,
        asOfDate,
        reason: eventName,
        correlationId: corrId,
      });
    }

    // ── Portfolio membership changes trigger rollups ─────────────────────
    if (this.isPortfolioEvent(eventName) && payload.portfolioId) {
      await this.enqueueService.enqueuePortfolioRollup({
        workspaceId: payload.workspaceId,
        portfolioId: payload.portfolioId,
        asOfDate,
        reason: eventName,
        correlationId: corrId,
      });
    }

    // ── Program membership changes trigger rollups ──────────────────────
    if (this.isProgramEvent(eventName) && payload.programId) {
      await this.enqueueService.enqueueProgramRollup({
        workspaceId: payload.workspaceId,
        programId: payload.programId,
        asOfDate,
        reason: eventName,
        correlationId: corrId,
      });
    }
  }

  private isPortfolioEvent(eventName: string): boolean {
    return (
      eventName === DOMAIN_EVENTS.PROJECT_ASSIGNED_TO_PORTFOLIO ||
      eventName === DOMAIN_EVENTS.PROJECT_REMOVED_FROM_PORTFOLIO ||
      eventName === DOMAIN_EVENTS.PORTFOLIO_GOVERNANCE_CHANGED
    );
  }

  private isProgramEvent(eventName: string): boolean {
    return (
      eventName === DOMAIN_EVENTS.PROJECT_ASSIGNED_TO_PROGRAM ||
      eventName === DOMAIN_EVENTS.PROJECT_REMOVED_FROM_PROGRAM ||
      eventName === DOMAIN_EVENTS.PROGRAM_GOVERNANCE_CHANGED
    );
  }
}
