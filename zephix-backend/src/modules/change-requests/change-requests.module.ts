import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangeRequestEntity } from './entities/change-request.entity';
import { ChangeRequestsService } from './services/change-requests.service';
import { ChangeRequestsController } from './controllers/change-requests.controller';
import { GovernanceRulesModule } from '../governance-rules/governance-rules.module';
// KpiQueueModule is @Global() — DomainEventEmitterService available without import

@Module({
  imports: [
    TypeOrmModule.forFeature([ChangeRequestEntity]),
    GovernanceRulesModule,
  ],
  providers: [ChangeRequestsService],
  controllers: [ChangeRequestsController],
  exports: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
