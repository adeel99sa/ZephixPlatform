import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { ExternalTask } from '../entities/external-task.entity';
import { ExternalTaskEvent } from '../entities/external-task-event.entity';
import { ExternalUserMappingService } from './external-user-mapping.service';
import { generatePollingIdempotencyKey } from '../utils/idempotency.util';
import { JiraIssue } from './jira-client.service';

interface UpsertExternalTaskInput {
  organizationId: string;
  connectionId: string;
  issue: JiraIssue;
  externalSystem: 'jira' | 'linear' | 'github';
  baseUrl: string;
}

@Injectable()
export class ExternalTaskService {
  private readonly logger = new Logger(ExternalTaskService.name);

  constructor(
    @InjectRepository(ExternalTask)
    private externalTaskRepository: Repository<ExternalTask>,
    @InjectRepository(ExternalTaskEvent)
    private externalTaskEventRepository: Repository<ExternalTaskEvent>,
    private userMappingService: ExternalUserMappingService,
  ) {}

  /**
   * Upsert external task with idempotency check
   * Returns true if task was processed (new or updated), false if skipped due to idempotency
   */
  async upsertExternalTask(input: UpsertExternalTaskInput): Promise<boolean> {
    const { organizationId, connectionId, issue, externalSystem, baseUrl } =
      input;

    // Generate idempotency key
    const idempotencyKey = generatePollingIdempotencyKey(connectionId, {
      id: issue.id,
      key: issue.key,
      updated: issue.fields.updated,
    });

    // Try to insert event record (idempotency check)
    try {
      const event = this.externalTaskEventRepository.create({
        idempotencyKey,
        organizationId,
        externalSystem,
        eventType: 'issue.updated',
        status: 'processed',
      });

      await this.externalTaskEventRepository.save(event);
    } catch (error) {
      // If unique constraint violation, skip this issue (already processed)
      if (
        error instanceof QueryFailedError &&
        (error as any).code === '23505' // PostgreSQL unique violation
      ) {
        this.logger.debug(
          `Skipping issue ${issue.key} - already processed (idempotency key: ${idempotencyKey})`,
        );
        return false; // Skipped due to idempotency
      }
      // Re-throw other errors
      throw error;
    }

    // Event inserted successfully - proceed with task upsert

    // Resolve assigneeEmail to resourceId
    let resourceId: string | undefined;
    if (issue.fields.assignee?.emailAddress) {
      const mapping = await this.userMappingService.findByEmail(
        organizationId,
        externalSystem,
        issue.fields.assignee.emailAddress,
      );
      if (mapping) {
        resourceId = mapping.resourceId;
      }
    }

    // Parse dates
    const dueDate = issue.fields.duedate
      ? new Date(issue.fields.duedate)
      : undefined;

    // Parse sprint dates from customfield_10020 (if present)
    let startDate: Date | undefined;
    if (
      issue.fields.customfield_10020 &&
      issue.fields.customfield_10020.length > 0
    ) {
      const sprint = issue.fields.customfield_10020[0];
      if (sprint.startDate) {
        startDate = new Date(sprint.startDate);
      }
    }

    // Convert time estimate from seconds to hours
    const estimateHours = issue.fields.timeoriginalestimate
      ? issue.fields.timeoriginalestimate / 3600
      : undefined;

    // Build external URL
    const externalUrl = `${baseUrl}/browse/${issue.key}`;

    // Upsert external task
    const existingTask = await this.externalTaskRepository.findOne({
      where: {
        organizationId,
        externalSystem,
        externalId: issue.id,
      },
    });

    if (existingTask) {
      // Update existing task
      existingTask.title = issue.fields.summary;
      existingTask.status = 'open'; // Default status - can be enhanced later
      existingTask.assigneeEmail = issue.fields.assignee?.emailAddress;
      existingTask.resourceId = resourceId;
      existingTask.startDate = startDate;
      existingTask.dueDate = dueDate;
      existingTask.estimateHours = estimateHours;
      existingTask.externalUrl = externalUrl;
      existingTask.lastSyncedAt = new Date();
      existingTask.rawPayload = issue;

      await this.externalTaskRepository.save(existingTask);
    } else {
      // Create new task
      const newTask = this.externalTaskRepository.create({
        organizationId,
        externalSystem,
        externalId: issue.id,
        title: issue.fields.summary,
        status: 'open',
        assigneeEmail: issue.fields.assignee?.emailAddress,
        resourceId,
        startDate,
        dueDate,
        estimateHours,
        externalUrl,
        lastSyncedAt: new Date(),
        rawPayload: issue,
      });

      await this.externalTaskRepository.save(newTask);
    }

    return true; // Processed successfully
  }
}
