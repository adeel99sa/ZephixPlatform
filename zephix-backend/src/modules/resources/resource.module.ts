import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { UserDailyCapacity } from './entities/user-daily-capacity.entity';
import { ResourceAllocationService } from './resource-allocation.service';
import { ResourcesService } from './resources.service';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { ResourceAllocationController } from './resource-allocation.controller';
import { ResourcesController } from './resources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Resource, ResourceAllocation, UserDailyCapacity])],
  providers: [ResourceAllocationService, ResourcesService, ResourceHeatMapService],
  controllers: [ResourceAllocationController, ResourcesController],
  exports: [ResourceAllocationService, ResourcesService, ResourceHeatMapService],
})
export class ResourceModule {}
