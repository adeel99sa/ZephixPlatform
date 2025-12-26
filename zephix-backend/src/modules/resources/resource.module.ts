import { Module, forwardRef } from '@nestjs/common';
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
import { Organization } from '../../organizations/entities/organization.entity';
import { ResourceDailyLoad } from './entities/resource-daily-load.entity';
import { ResourceTimelineService } from './services/resource-timeline.service';
import { TenancyModule } from '../tenancy/tenancy.module';
import { createTenantAwareRepositoryProvider } from '../tenancy/tenant-aware-repository.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Resource,
      ResourceAllocation,
      UserDailyCapacity,
      ResourceConflict,
      AuditLog,
      ResourceDailyLoad,
      Task,
      Project,
      Workspace,
      Organization,
    ]),
    TenancyModule, // Required for TenantAwareRepository
    forwardRef(() => WorkspacesModule), // Required for WorkspaceAccessService injection
  ],
  providers: [
    // Provide TenantAwareRepository for tenant-scoped entities
    createTenantAwareRepositoryProvider(ResourceAllocation),
    createTenantAwareRepositoryProvider(Project),
    createTenantAwareRepositoryProvider(Resource),
    createTenantAwareRepositoryProvider(UserDailyCapacity),
    ResourceAllocationService,
    ResourcesService,
    ResourceHeatMapService,
    ResourceCalculationService,
    ResourceRiskScoreService,
    ResourceTimelineService,
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
    ResourceTimelineService,
    AuditService,
    CacheService,
  ],
})
export class ResourceModule {}
