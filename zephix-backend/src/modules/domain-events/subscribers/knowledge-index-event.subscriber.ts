import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeIndexService } from '../../knowledge-index/services/knowledge-index.service';
import { Task } from '../../tasks/entities/task.entity';
import { Risk } from '../../risks/entities/risk.entity';
import type {
  TaskCreatedEvent,
  TaskUpdatedEvent,
  RiskCreatedEvent,
  RiskUpdatedEvent,
  CommentCreatedEvent,
} from '../domain-events.types';

/**
 * Phase 8: Knowledge Index Event Subscriber
 * Listens to domain events and indexes content for RAG
 */
@Injectable()
export class KnowledgeIndexEventSubscriber {
  private readonly logger = new Logger(KnowledgeIndexEventSubscriber.name);

  constructor(
    private readonly knowledgeIndexService: KnowledgeIndexService,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(Risk)
    private riskRepo: Repository<Risk>,
  ) {}

  @OnEvent('task.created')
  async handleTaskCreated(event: TaskCreatedEvent) {
    try {
      const task = await this.taskRepo.findOne({ where: { id: event.taskId } });
      if (task) {
        await this.knowledgeIndexService.indexTask(task);
      }
    } catch (error) {
      this.logger.error(`Failed to index task ${event.taskId}:`, error);
    }
  }

  @OnEvent('task.updated')
  async handleTaskUpdated(event: TaskUpdatedEvent) {
    try {
      const task = await this.taskRepo.findOne({ where: { id: event.taskId } });
      if (task) {
        await this.knowledgeIndexService.indexTask(task);
      }
    } catch (error) {
      this.logger.error(`Failed to index task ${event.taskId}:`, error);
    }
  }

  @OnEvent('risk.created')
  async handleRiskCreated(event: RiskCreatedEvent) {
    try {
      const risk = await this.riskRepo.findOne({ where: { id: event.riskId } });
      if (risk) {
        await this.knowledgeIndexService.indexRisk(risk);
      }
    } catch (error) {
      this.logger.error(`Failed to index risk ${event.riskId}:`, error);
    }
  }

  @OnEvent('risk.updated')
  async handleRiskUpdated(event: RiskUpdatedEvent) {
    try {
      const risk = await this.riskRepo.findOne({ where: { id: event.riskId } });
      if (risk) {
        await this.knowledgeIndexService.indexRisk(risk);
      }
    } catch (error) {
      this.logger.error(`Failed to index risk ${event.riskId}:`, error);
    }
  }

  @OnEvent('comment.created')
  async handleCommentCreated(event: CommentCreatedEvent) {
    // TODO: Index comments when comment entity is available
    this.logger.debug(
      `Comment created event: ${event.commentId} (indexing not yet implemented)`,
    );
  }
}

