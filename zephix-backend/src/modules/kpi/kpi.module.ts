import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KPIService } from './kpi.service';
import { KPIController } from './kpi.controller';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { Resource } from '../resources/entities/resource.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project, Resource])],
  providers: [KPIService],
  controllers: [KPIController],
  exports: [KPIService],
})
export class KPIModule {}
