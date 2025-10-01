import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceConflict } from './entities/resource-conflict.entity';
import { UserDailyCapacity } from './entities/user-daily-capacity.entity';
import { ResourceAllocationService } from './resource-allocation.service';
import { ResourcesService } from './resources.service';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { ResourceCalculationService } from './services/resource-calculation.service';
import { AuditService } from './services/audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { CacheService } from '../cache/cache.service';
import { ResourceAllocationController } from './resource-allocation.controller';
import { ResourcesController } from './resources.controller';
import { TestResourcesController } from './test-resources.controller';
import { Task } from '../tasks/entities/task.entity';
import { ResponseService } from '../../shared/services/response.service';

@Module({
  imports: [TypeOrmModule.forFeature([Resource, ResourceAllocation, ResourceConflict, UserDailyCapacity, AuditLog, Task])],
  providers: [ResourceAllocationService, ResourcesService, ResourceHeatMapService, ResourceCalculationService, AuditService, CacheService, ResponseService],
  controllers: [ResourceAllocationController, ResourcesController, TestResourcesController],
  exports: [ResourceAllocationService, ResourcesService, ResourceHeatMapService, ResourceCalculationService, AuditService, CacheService],
})
export class ResourceModule {}