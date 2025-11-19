import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { UserDailyCapacity } from './entities/user-daily-capacity.entity';
import { ResourceAllocationService } from './resource-allocation.service';
import { ResourcesService } from './resources.service';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { ResourceCalculationService } from './services/resource-calculation.service';
import { ResourceRiskScoreService } from './services/resource-risk-score.service';
import { AuditService } from './services/audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { CacheService } from '../cache/cache.service';
import { ResourceAllocationController } from './resource-allocation.controller';
import { ResourcesController } from './resources.controller';
import { Task } from '../tasks/entities/task.entity';
import { ResponseService } from '../../shared/services/response.service';
import { Project } from '../projects/entities/project.entity';
import { ResourceConflict } from './entities/resource-conflict.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Resource,
      ResourceAllocation,
      UserDailyCapacity,
      ResourceConflict,
      AuditLog,
      Task,
      Project,
      Workspace,
    ]),
    WorkspacesModule, // Provides WorkspaceAccessService for membership filtering
  ],
  providers: [
    ResourceAllocationService,
    ResourcesService,
    ResourceHeatMapService,
    ResourceCalculationService,
    ResourceRiskScoreService,
    AuditService,
    CacheService,
    ResponseService,
  ],
  controllers: [ResourceAllocationController, ResourcesController],
  exports: [
    ResourceAllocationService,
    ResourcesService,
    ResourceHeatMapService,
    ResourceCalculationService,
    ResourceRiskScoreService,
    AuditService,
    CacheService,
  ],
})
export class ResourceModule {}
