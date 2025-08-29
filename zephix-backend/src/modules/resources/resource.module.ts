import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { UserDailyCapacity } from './entities/user-daily-capacity.entity';
import { ResourceAllocationService } from './resource-allocation.service';
import { ResourceAllocationController } from './resource-allocation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceAllocation, UserDailyCapacity])],
  providers: [ResourceAllocationService],
  controllers: [ResourceAllocationController],
  exports: [ResourceAllocationService],
})
export class ResourceModule {}
