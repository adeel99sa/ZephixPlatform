import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from './entities/analytics-event.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private analyticsRepository: Repository<AnalyticsEvent>
  ) {}

  async track(event: any) {
    // Store in database
    await this.analyticsRepository.save({
      eventName: event.event,
      userId: event.userId,
      organizationId: event.organizationId,
      properties: event.properties,
      timestamp: new Date()
    });
    
    return { success: true };
  }

  async getEvents(organizationId: string, eventName?: string) {
    const query = this.analyticsRepository
      .createQueryBuilder('event')
      .where('event.organizationId = :organizationId', { organizationId });
    
    if (eventName) {
      query.andWhere('event.eventName = :eventName', { eventName });
    }
    
    return query.orderBy('event.timestamp', 'DESC').getMany();
  }

  async getSoftDeleteStats(organizationId: string) {
    const deleteEvents = await this.analyticsRepository
      .createQueryBuilder('event')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.eventName IN (:...events)', { 
        events: ['project_deleted', 'task_deleted'] 
      })
      .getMany();

    const undoEvents = await this.analyticsRepository
      .createQueryBuilder('event')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.eventName IN (:...events)', { 
        events: ['project_delete_undone', 'task_delete_undone'] 
      })
      .getMany();

    const confirmEvents = await this.analyticsRepository
      .createQueryBuilder('event')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.eventName IN (:...events)', { 
        events: ['project_delete_confirmed', 'task_delete_confirmed'] 
      })
      .getMany();

    return {
      totalDeletes: deleteEvents.length,
      totalUndos: undoEvents.length,
      totalConfirms: confirmEvents.length,
      undoRate: deleteEvents.length > 0 ? (undoEvents.length / deleteEvents.length) * 100 : 0,
      averageTimeToUndo: this.calculateAverageTimeToUndo(undoEvents)
    };
  }

  private calculateAverageTimeToUndo(undoEvents: AnalyticsEvent[]): number {
    if (undoEvents.length === 0) return 0;
    
    const totalTime = undoEvents.reduce((sum, event) => {
      const timeToUndo = event.properties?.timeToUndo || 0;
      return sum + timeToUndo;
    }, 0);
    
    return totalTime / undoEvents.length;
  }
}