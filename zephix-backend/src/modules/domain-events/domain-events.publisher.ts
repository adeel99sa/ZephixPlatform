import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import type { DomainEvent } from './domain-events.types';

/**
 * Phase 8: Domain Events Publisher
 * Centralized publisher for all domain events
 */
@Injectable()
export class DomainEventsPublisher {
  private readonly logger = new Logger(DomainEventsPublisher.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Publish a domain event
   */
  async publish(event: DomainEvent): Promise<void> {
    try {
      // Add event metadata
      const enrichedEvent = {
        ...event,
        eventId: event.eventId || uuidv4(),
        timestamp: event.timestamp || new Date(),
      };

      // Emit event using EventEmitter2
      this.eventEmitter.emit(event.type || event.name, enrichedEvent);

      // Also emit wildcard pattern for subscribers that listen to all events
      this.eventEmitter.emit('domain.*', enrichedEvent);

      this.logger.debug(`Published domain event: ${event.type || event.name}`, {
        eventId: enrichedEvent.eventId,
        organizationId: event.organizationId || event.orgId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish domain event: ${event.type || event.name}`,
        error,
      );
      // Don't throw - event publishing should not break business logic
    }
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }
}
