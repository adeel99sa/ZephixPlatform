import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConnection } from '../entities/integration-connection.entity';
import { JiraClientService } from './jira-client.service';
import { ExternalTaskService } from './external-task.service';
import { DomainEventsPublisher } from '../../domain-events/domain-events.publisher';

interface SyncNowResult {
  status: 'success' | 'error' | 'partial';
  issuesProcessed: number;
  totalIssues: number;
  errorMessage?: string;
}

@Injectable()
export class IntegrationSyncService {
  private readonly logger = new Logger(IntegrationSyncService.name);

  constructor(
    @InjectRepository(IntegrationConnection)
    private connectionRepository: Repository<IntegrationConnection>,
    private jiraClientService: JiraClientService,
    private externalTaskService: ExternalTaskService,
    private domainEventsPublisher: DomainEventsPublisher,
  ) {}

  async syncNow(
    connectionId: string,
    organizationId: string,
  ): Promise<SyncNowResult> {
    // Load connection by id and org (scoped to organizationId)
    const connection = await this.connectionRepository.findOne({
      where: {
        id: connectionId,
        organizationId,
      },
    });

    if (!connection) {
      throw new NotFoundException(
        `Integration connection ${connectionId} not found for organization`,
      );
    }

    if (!connection.enabled) {
      throw new Error('Integration connection is disabled');
    }

    if (connection.type !== 'jira') {
      throw new Error(
        `Sync not supported for integration type: ${connection.type}`,
      );
    }

    // Build JQL query
    const jql = connection.jqlFilter || 'ORDER BY updated DESC';

    try {
      // Call JiraClientService.searchIssues
      const searchResponse = await this.jiraClientService.searchIssues(
        connection,
        jql,
        0,
        50, // Max 50 issues per sync for Phase 2
      );

      const totalIssues = searchResponse.total;
      let issuesProcessed = 0;
      let errors = 0;

      // For each issue, call ExternalTaskService upsert flow
      for (const issue of searchResponse.issues) {
        try {
          const wasProcessed =
            await this.externalTaskService.upsertExternalTask({
              organizationId,
              connectionId: connection.id,
              issue,
              externalSystem: connection.type,
              baseUrl: connection.baseUrl,
            });

          if (wasProcessed) {
            issuesProcessed++;

            // Publish domain event external_task.updated after upsert
            await this.domainEventsPublisher.publish({
              name: 'external_task.updated',
              type: 'external_task.updated',
              orgId: organizationId,
              organizationId,
              occurredAt: new Date(),
              timestamp: new Date(),
              data: {
                connectionId: connection.id,
                issueId: issue.id,
                issueKey: issue.key,
                organizationId,
              },
            });
          }
        } catch (error: any) {
          errors++;
          this.logger.error(
            `Failed to process issue ${issue.key}: ${error.message}`,
            error.stack,
          );
          // Continue processing other issues
        }
      }

      // Determine status
      let status: 'success' | 'error' | 'partial';
      if (errors === 0) {
        status = 'success'; // No errors, even if no issues processed
      } else if (errors > 0 && issuesProcessed === 0) {
        status = 'error';
      } else {
        status = 'partial';
      }

      // Update connection last sync info
      connection.lastSyncRunAt = new Date();
      connection.lastSyncStatus = status;
      await this.connectionRepository.save(connection);

      return {
        status,
        issuesProcessed,
        totalIssues,
        errorMessage:
          errors > 0 ? `${errors} issue(s) failed to process` : undefined,
      };
    } catch (error: any) {
      this.logger.error(
        `Sync failed for connection ${connectionId}: ${error.message}`,
        error.stack,
      );

      // Update connection error state
      connection.lastSyncRunAt = new Date();
      connection.lastSyncStatus = 'error';
      connection.errorCount = (connection.errorCount || 0) + 1;
      connection.lastError = error.message;
      await this.connectionRepository.save(connection);

      return {
        status: 'error',
        issuesProcessed: 0,
        totalIssues: 0,
        errorMessage: error.message,
      };
    }
  }
}
