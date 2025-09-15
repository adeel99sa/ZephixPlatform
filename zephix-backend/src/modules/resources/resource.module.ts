import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { UserDailyCapacity } from './entities/user-daily-capacity.entity';
import { ResourceAllocationService } from './resource-allocation.service';
import { ResourcesService } from './resources.service';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { AuditService } from './services/audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { CacheService } from '../cache/cache.service';
import { ResourceAllocationController } from './resource-allocation.controller';
import { ResourcesController } from './resources.controller';
import { Task } from '../tasks/entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Resource, ResourceAllocation, UserDailyCapacity, AuditLog, Task])],
  providers: [ResourceAllocationService, ResourcesService, ResourceHeatMapService, AuditService, CacheService],
  controllers: [ResourceAllocationController, ResourcesController],
  exports: [ResourceAllocationService, ResourcesService, ResourceHeatMapService, AuditService, CacheService],
})
export class ResourceModule {}