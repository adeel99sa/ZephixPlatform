import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { UserDailyCapacity } from './entities/user-daily-capacity.entity';
import { ResourceConflict } from './entities/resource-conflict.entity';
import { ResourceAllocationService } from './resource-allocation.service';
import { ResourceConflictService } from './resource-conflict.service';
import { ResourceValidationService } from './resource-validation.service';
import { ResourceAllocationController } from './resource-allocation.controller';
import { ResourcesController } from './resources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceAllocation, UserDailyCapacity, ResourceConflict])],
  providers: [ResourceAllocationService, ResourceConflictService, ResourceValidationService],
  controllers: [ResourceAllocationController, ResourcesController],
  exports: [ResourceAllocationService, ResourceConflictService, ResourceValidationService],
})
export class ResourceModule {}
