import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceConflict } from './entities/resource-conflict.entity';
import { ResourceConflictService } from './resource-conflict.service';
import { ResourceValidationService } from './resource-validation.service';
import { ResourcesController } from './resources.controller';
import { User } from '../modules/users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResourceAllocation, 
      ResourceConflict,
      User,  // Add this
      Project // Add this
    ]),
    ScheduleModule.forRoot()
  ],
  controllers: [ResourcesController],
  providers: [
    ResourceConflictService,
    ResourceValidationService // Add this
  ],
  exports: [ResourceConflictService]
})
export class ResourcesModule {}
