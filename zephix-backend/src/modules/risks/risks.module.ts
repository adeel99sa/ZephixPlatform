import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskDetectionService } from './risk-detection.service';
import { Project } from '../projects/entities/project.entity';
import { ResourceAllocation } from '../resources/entities/resource-allocation.entity';
import { WorkTask } from '../work-management/entities/work-task.entity';
import { WorkTaskDependency } from '../work-management/entities/task-dependency.entity';
import { WorkManagementModule } from '../work-management/work-management.module';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ResourceAllocation, WorkTask, WorkTaskDependency]),
    TenancyModule, // Required for TenantAwareRepository
    WorkManagementModule,
  ],
  providers: [
    // Provide TenantAwareRepository for tenant-scoped entities
    createTenantAwareRepositoryProvider(Project),
    createTenantAwareRepositoryProvider(ResourceAllocation),
    createTenantAwareRepositoryProvider(WorkTask),
    RiskDetectionService,
  ],
  exports: [RiskDetectionService],
})
export class RisksModule {}
