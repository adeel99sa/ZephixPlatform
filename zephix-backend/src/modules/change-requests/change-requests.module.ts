import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangeRequestEntity } from './entities/change-request.entity';
import { ChangeRequestsService } from './services/change-requests.service';
import { ChangeRequestsController } from './controllers/change-requests.controller';
import { GovernanceRulesModule } from '../governance-rules/governance-rules.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
// KpiQueueModule is @Global() — DomainEventEmitterService available without import

@Module({
  imports: [
    TypeOrmModule.forFeature([ChangeRequestEntity]),
    GovernanceRulesModule,
    WorkspaceAccessModule, // DOC-TENANT-1 sweep: WorkspaceRoleGuardService
  ],
  providers: [ChangeRequestsService],
  controllers: [ChangeRequestsController],
  exports: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
