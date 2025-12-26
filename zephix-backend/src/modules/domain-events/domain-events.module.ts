import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainEventsPublisher } from './domain-events.publisher';
import { AnalyticsEventSubscriber } from './subscribers/analytics-event.subscriber';
import { KnowledgeIndexEventSubscriber } from './subscribers/knowledge-index-event.subscriber';
import { Task } from '../tasks/entities/task.entity';
import { Risk } from '../risks/entities/risk.entity';
import { AnalyticsModule } from '../analytics/analytics.module';
import { KnowledgeIndexModule } from '../knowledge-index/knowledge-index.module';

/**
 * Phase 8: Domain Events Module
 * Provides event publishing and subscription infrastructure
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([Task, Risk]),
    AnalyticsModule,
    KnowledgeIndexModule,
  ],
  providers: [
    DomainEventsPublisher,
    AnalyticsEventSubscriber,
    KnowledgeIndexEventSubscriber,
  ],
  exports: [DomainEventsPublisher],
})
export class DomainEventsModule {}
