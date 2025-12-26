import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IntegrationConnectionService } from './services/integration-connection.service';
import { JiraClientService } from './services/jira-client.service';
import { IntegrationSyncService } from './services/integration-sync.service';
import { CreateIntegrationConnectionDto } from './dto/create-integration-connection.dto';
import { TestConnectionDto } from './dto/test-connection.dto';
import { SyncNowDto } from './dto/sync-now.dto';
import {
  formatResponse,
  formatArrayResponse,
} from '../../shared/helpers/response.helper';

@Controller('api/integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    private readonly connectionService: IntegrationConnectionService,
    private readonly jiraClientService: JiraClientService,
    private readonly syncService: IntegrationSyncService,
  ) {}

  @Post()
  async createConnection(
    @Body() dto: CreateIntegrationConnectionDto,
    @CurrentUser() user: any,
  ) {
    // Scope by organizationId from JWT
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID required');
    }

    const connection = await this.connectionService.createConnection(
      organizationId,
      dto,
    );

    // Sanitize response (no secrets)
    const sanitized = this.connectionService.sanitizeConnection(connection);

    return formatResponse(sanitized);
  }

  @Get()
  async listConnections(@CurrentUser() user: any) {
    // Scope by organizationId from JWT
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID required');
    }

    const connections =
      await this.connectionService.listConnections(organizationId);

    // Sanitize all connections (no secrets)
    const sanitized = connections.map((conn) =>
      this.connectionService.sanitizeConnection(conn),
    );

    return formatArrayResponse(sanitized);
  }

  @Post(':id/test')
  async testConnection(
    @Param('id') connectionId: string,
    @Body() dto: TestConnectionDto,
    @CurrentUser() user: any,
  ) {
    // Scope by organizationId from JWT
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID required');
    }

    const connection = await this.connectionService.getConnectionById(
      connectionId,
      organizationId,
    );

    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }

    // Test connection using JiraClientService
    const result = await this.jiraClientService.testConnection(connection);

    // Map result to { connected, message } format
    return formatResponse({
      connected: result.connected,
      message: result.message,
    });
  }

  @Post(':id/sync-now')
  async syncNow(
    @Param('id') connectionId: string,
    @Body() dto: SyncNowDto,
    @CurrentUser() user: any,
  ) {
    // Scope by organizationId from JWT
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID required');
    }

    const result = await this.syncService.syncNow(connectionId, organizationId);

    return formatResponse({
      status: result.status,
      issuesProcessed: result.issuesProcessed,
    });
  }
}
