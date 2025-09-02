import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceConflict } from './entities/resource-conflict.entity';
import { ResourcesService } from './services/resources.service';
import { ResourcesController } from './controllers/resources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceAllocation, ResourceConflict])],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
