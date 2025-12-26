import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Risk } from './entities/risk.entity';
import { RiskDetectionService } from './risk-detection.service';
import { Project } from '../projects/entities/project.entity';
import { ResourceAllocation } from '../resources/entities/resource-allocation.entity';
import { Task } from '../tasks/entities/task.entity';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Risk, Project, ResourceAllocation, Task]),
    TenancyModule, // Required for TenantAwareRepository
  ],
  providers: [
    // Provide TenantAwareRepository for tenant-scoped entities
    createTenantAwareRepositoryProvider(Risk),
    createTenantAwareRepositoryProvider(Project),
    createTenantAwareRepositoryProvider(ResourceAllocation),
    createTenantAwareRepositoryProvider(Task),
    RiskDetectionService,
  ],
  exports: [RiskDetectionService],
})
export class RisksModule {}
