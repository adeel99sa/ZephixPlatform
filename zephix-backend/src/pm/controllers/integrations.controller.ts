import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { CurrentOrg } from '../../organizations/decorators/current-org.decorator';
import { IntegrationService } from '../services/integration.service';

export interface IntegrationConfig {
  token?: string;
  webhookUrl?: string;
  apiKey?: string;
  organization?: string;
  repository?: string;
  enableWebhooks?: boolean;
  webhookEvents?: string[];
}

export interface IntegrationStatus {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSync?: Date;
  config?: Partial<IntegrationConfig>;
  error?: string;
}

@ApiTags('integrations')
@ApiBearerAuth('JWT-auth')
@Controller('integrations')
@UseGuards(AuthGuard('jwt'), OrganizationGuard)
export class IntegrationsController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all integrations for the organization' })
  @ApiResponse({ status: 200, description: 'List of integrations' })
  async getIntegrations(
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ): Promise<IntegrationStatus[]> {
    // Mock implementation - replace with actual service method
    return [
      {
        id: 'jira-001',
        name: 'Jira',
        type: 'project_management',
        status: 'connected',
        lastSync: new Date(),
      },
      {
        id: 'slack-001',
        name: 'Slack',
        type: 'communication',
        status: 'connected',
        lastSync: new Date(),
      },
      {
        id: 'github-001',
        name: 'GitHub',
        type: 'version_control',
        status: 'disconnected',
      },
      {
        id: 'teams-001',
        name: 'Microsoft Teams',
        type: 'communication',
        status: 'disconnected',
      },
      {
        id: 'gitlab-001',
        name: 'GitLab',
        type: 'version_control',
        status: 'error',
        error: 'Invalid credentials',
      },
      {
        id: 'azure-001',
        name: 'Azure DevOps',
        type: 'devops',
        status: 'connected',
        lastSync: new Date(),
      },
    ];
  }

  @Get(':integrationId')
  @ApiOperation({ summary: 'Get integration details' })
  @ApiParam({ name: 'integrationId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Integration details' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async getIntegration(
    @Param('integrationId') integrationId: string,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ): Promise<IntegrationStatus> {
    // Mock implementation
    return {
      id: integrationId,
      name: 'Jira',
      type: 'project_management',
      status: 'connected',
      lastSync: new Date(),
      config: {
        organization: 'example-org',
      },
    };
  }

  @Post(':integrationType/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test integration connection' })
  @ApiParam({ name: 'integrationType', type: 'string', enum: ['jira', 'slack', 'github', 'teams', 'gitlab', 'azure-devops'] })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  @ApiResponse({ status: 400, description: 'Connection test failed' })
  async testConnection(
    @Param('integrationType') integrationType: string,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ) {
    // Mock implementation - simulate connection test
    const successTypes = ['jira', 'github', 'azure-devops'];
    const success = successTypes.includes(integrationType);
    
    if (!success) {
      throw new BadRequestException(`${integrationType} connection failed: Invalid credentials or network error`);
    }

    return {
      success: true,
      message: `${integrationType} connection successful`,
      timestamp: new Date(),
    };
  }

  @Post(':integrationType/configure')
  @ApiOperation({ summary: 'Configure integration' })
  @ApiParam({ name: 'integrationType', type: 'string' })
  @ApiResponse({ status: 201, description: 'Integration configured' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  async configureIntegration(
    @Param('integrationType') integrationType: string,
    @Body() config: IntegrationConfig,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ) {
    // Validate required fields based on integration type
    if (integrationType === 'github' && (!config.token || !config.organization)) {
      throw new BadRequestException('GitHub integration requires token and organization');
    }

    return {
      id: `${integrationType}-${Date.now()}`,
      name: integrationType,
      type: integrationType,
      status: 'connected',
      message: `${integrationType} integration configured successfully`,
      config: {
        ...config,
        token: config.token ? '***' : undefined, // Mask sensitive data
      },
    };
  }

  @Put(':integrationId')
  @ApiOperation({ summary: 'Update integration configuration' })
  @ApiParam({ name: 'integrationId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Integration updated' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async updateIntegration(
    @Param('integrationId') integrationId: string,
    @Body() config: Partial<IntegrationConfig>,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ) {
    return {
      id: integrationId,
      message: 'Integration updated successfully',
      config: {
        ...config,
        token: config.token ? '***' : undefined,
      },
    };
  }

  @Delete(':integrationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect integration' })
  @ApiParam({ name: 'integrationId', type: 'string' })
  @ApiResponse({ status: 204, description: 'Integration disconnected' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async disconnectIntegration(
    @Param('integrationId') integrationId: string,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ) {
    // Service would handle actual disconnection
    return;
  }

  @Post(':integrationId/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger manual sync for integration' })
  @ApiParam({ name: 'integrationId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Sync initiated' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async syncIntegration(
    @Param('integrationId') integrationId: string,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ) {
    return {
      message: 'Sync initiated',
      integrationId,
      timestamp: new Date(),
      estimatedDuration: '2-5 minutes',
    };
  }

  @Get(':integrationId/health')
  @ApiOperation({ summary: 'Get integration health status' })
  @ApiParam({ name: 'integrationId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Integration health metrics' })
  async getIntegrationHealth(
    @Param('integrationId') integrationId: string,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ) {
    return {
      integrationId,
      status: 'healthy',
      uptime: 99.9,
      lastSync: new Date(),
      syncFrequency: '15 minutes',
      errorRate: 0.1,
      metrics: {
        totalSyncs: 1234,
        successfulSyncs: 1230,
        failedSyncs: 4,
        averageSyncDuration: '45 seconds',
      },
    };
  }
}