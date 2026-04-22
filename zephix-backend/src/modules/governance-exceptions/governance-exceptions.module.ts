import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { GovernanceException } from './entities/governance-exception.entity';
import { GovernanceExceptionsService } from './governance-exceptions.service';
import { GovernanceExceptionsController } from './governance-exceptions.controller';
import { AdminGuard } from '../../admin/guards/admin.guard';
// AuditModule is @Global() — AuditService available without import

@Module({
  imports: [
    TypeOrmModule.forFeature([GovernanceException]),
    SharedModule, // ResponseService
  ],
  providers: [GovernanceExceptionsService, AdminGuard],
  controllers: [GovernanceExceptionsController],
  exports: [GovernanceExceptionsService],
})
export class GovernanceExceptionsModule {}
