import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import type {
  TaskCreatedEvent,
  TaskUpdatedEvent,
  RiskCreatedEvent,
  RiskUpdatedEvent,
} from '../domain-events.types';

/**
 * Phase 8: Analytics Event Subscriber
 * Listens to domain events and triggers analytics recalculation
 */
@Injectable()
export class AnalyticsEventSubscriber {
  private readonly logger = new Logger(AnalyticsEventSubscriber.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @OnEvent('task.created')
  async handleTaskCreated(event: TaskCreatedEvent) {
    this.logger.debug(`Task created event: ${event.taskId}`);
    await this.analyticsService.recalculateProjectMetrics(
      event.projectId,
      event.orgId,
    );
  }

  @OnEvent('task.updated')
  async handleTaskUpdated(event: TaskUpdatedEvent) {
    this.logger.debug(`Task updated event: ${event.taskId}`);
    await this.analyticsService.recalculateProjectMetrics(
      event.projectId,
      event.orgId,
    );
  }

  @OnEvent('risk.created')
  async handleRiskCreated(event: RiskCreatedEvent) {
    this.logger.debug(`Risk created event: ${event.riskId}`);
    if (event.projectId) {
      await this.analyticsService.recalculateProjectMetrics(
        event.projectId,
        event.orgId,
      );
    }
  }

  @OnEvent('risk.updated')
  async handleRiskUpdated(event: RiskUpdatedEvent) {
    this.logger.debug(`Risk updated event: ${event.riskId}`);
    if (event.projectId) {
      await this.analyticsService.recalculateProjectMetrics(
        event.projectId,
        event.orgId,
      );
    }
  }
}
