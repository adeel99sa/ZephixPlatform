import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceService } from './services/resource.service';
import { ResourcesController } from './resources.controller';
import { ResourceHeatMapService } from './services/resource-heat-map.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceAllocation])],
  controllers: [ResourcesController],
  providers: [ResourceService, ResourceHeatMapService],
  exports: [ResourceService, ResourceHeatMapService],
})
export class ResourceModule {}
