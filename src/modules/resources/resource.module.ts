import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceAllocationService } from './services/resource-allocation.service';
import { ResourceAllocationController } from './controllers/resource-allocation.controller';
import { ResourcesController } from './resources.controller';
import { ResourceHeatMapService } from './services/resource-heat-map.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceAllocation])],
  controllers: [ResourceAllocationController, ResourcesController],
  providers: [ResourceAllocationService, ResourceHeatMapService],
  exports: [ResourceAllocationService, ResourceHeatMapService],
})
export class ResourceModule {}
