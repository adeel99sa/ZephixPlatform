import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { GovernanceException } from './entities/governance-exception.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { GovernanceExceptionsService } from './governance-exceptions.service';
import { GovernanceExceptionsController } from './governance-exceptions.controller';
import { AdminGuard } from '../../admin/guards/admin.guard';
// AuditModule is @Global() — AuditService available without import

@Module({
  imports: [
    TypeOrmModule.forFeature([GovernanceException, Workspace, Project, User]),
    SharedModule, // ResponseService
  ],
  providers: [GovernanceExceptionsService, AdminGuard],
  controllers: [GovernanceExceptionsController],
  exports: [GovernanceExceptionsService],
})
export class GovernanceExceptionsModule {}
