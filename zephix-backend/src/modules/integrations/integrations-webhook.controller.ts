import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationEncryptionService } from './services/integration-encryption.service';
import { formatResponse } from '../../shared/helpers/response.helper';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';

/**
 * Webhook controller for Jira integration
 *
 * DISABLED BY DEFAULT: Only processes webhooks when connection.webhookEnabled === true
 * This is a skeleton implementation - no processing logic yet (Phase 2 scope)
 */
@Controller('integrations/jira/webhook')
export class IntegrationsWebhookController {
  private readonly logger = new Logger(IntegrationsWebhookController.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(IntegrationConnection))
    private connectionRepository: TenantAwareRepository<IntegrationConnection>,
    private encryptionService: IntegrationEncryptionService,
  ) {}

  @Post(':connectionId')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleWebhook(
    @Param('connectionId') connectionId: string,
    @Body() payload: any,
    @Headers('x-atlassian-webhook-identifier') webhookId?: string,
  ) {
    // Load connection
    const connection = await this.connectionRepository.findOne({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new BadRequestException('Integration connection not found');
    }

    // Check if webhook is enabled for this connection
    if (!connection.webhookEnabled) {
      this.logger.debug(
        `Webhook received for disabled connection: ${connectionId}`,
      );
      // Return 202 Accepted but don't process
      return formatResponse({
        status: 'ignored',
        message: 'Webhook processing disabled for this connection',
        connectionId,
      });
    }

    // Verify webhook secret (if present)
    if (connection.webhookSecret) {
      // TODO: Implement webhook signature verification in Phase 3
      // For now, just log that verification would happen
      this.logger.debug(
        `Webhook signature verification would occur here for connection: ${connectionId}`,
      );
    }

    // Skeleton: Log webhook received but don't process yet
    this.logger.log('Webhook received (skeleton - no processing)', {
      connectionId,
      webhookEvent: payload.webhookEvent,
      issueKey: payload.issue?.key,
      organizationId: connection.organizationId,
    });

    // Return 202 Accepted (fast response, processing happens async in Phase 3)
    return formatResponse({
      status: 'accepted',
      message: 'Webhook received (processing disabled in Phase 2)',
      connectionId,
    });
  }
}
