import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { ExternalTask } from './entities/external-task.entity';
import { ExternalUserMapping } from './entities/external-user-mapping.entity';
import { ExternalTaskEvent } from './entities/external-task-event.entity';
import { IntegrationEncryptionService } from './services/integration-encryption.service';
import { JiraClientService } from './services/jira-client.service';
import { ExternalTaskService } from './services/external-task.service';
import { IntegrationSyncService } from './services/integration-sync.service';
import { ExternalUserMappingService } from './services/external-user-mapping.service';
import { IntegrationConnectionService } from './services/integration-connection.service';
import { IntegrationsController } from './integrations.controller';
import { ExternalUserMappingsController } from './external-user-mappings.controller';
import { IntegrationsWebhookController } from './integrations-webhook.controller';
import { DomainEventsModule } from '../domain-events/domain-events.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { createTenantAwareRepositoryProvider } from '../tenancy/tenant-aware-repository.provider';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegrationConnection,
      ExternalTask,
      ExternalUserMapping,
      ExternalTaskEvent,
    ]),
    TenancyModule, // Required for TenantAwareRepository
    ConfigModule,
    DomainEventsModule,
  ],
  providers: [
    // Provide TenantAwareRepository for IntegrationConnection
    createTenantAwareRepositoryProvider(IntegrationConnection),
    IntegrationEncryptionService,
    IntegrationConnectionService,
    JiraClientService,
    ExternalUserMappingService,
    ExternalTaskService,
    IntegrationSyncService,
  ],
  controllers: [
    IntegrationsController,
    ExternalUserMappingsController,
    IntegrationsWebhookController,
  ],
  exports: [IntegrationSyncService, ExternalTaskService],
})
export class IntegrationsModule {}
