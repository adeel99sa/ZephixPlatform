import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainEventsPublisher } from './domain-events.publisher';
import { AnalyticsEventSubscriber } from './subscribers/analytics-event.subscriber';
import { Task } from '../tasks/entities/task.entity';
import { WorkRisk } from '../work-management/entities/work-risk.entity';
import { AnalyticsModule } from '../analytics/analytics.module';

/**
 * Phase 8: Domain Events Module
 * Provides event publishing and subscription infrastructure
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([Task, WorkRisk]),
    AnalyticsModule,
  ],
  providers: [
    DomainEventsPublisher,
    AnalyticsEventSubscriber,
  ],
  exports: [DomainEventsPublisher],
})
export class DomainEventsModule {}
