import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { UserDailyCapacity } from './entities/user-daily-capacity.entity';
import { ResourceAllocationService } from './resource-allocation.service';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { ResourceAllocationController } from './resource-allocation.controller';
import { ResourcesController } from './resources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceAllocation, UserDailyCapacity])],
  providers: [ResourceAllocationService, ResourceHeatMapService],
  controllers: [ResourceAllocationController, ResourcesController],
  exports: [ResourceAllocationService, ResourceHeatMapService],
})
export class ResourceModule {}
