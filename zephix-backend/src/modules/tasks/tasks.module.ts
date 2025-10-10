import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TimelineController } from './timeline.controller';
import { DependencyService } from './services/dependency.service';
import { ResourceModule } from '../resources/resource.module';
import { KPIModule } from '../kpi/kpi.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskDependency]),
    ResourceModule,
    KPIModule,
  ],
  controllers: [TasksController, TimelineController],
  providers: [TasksService, DependencyService],
  exports: [TasksService, DependencyService],
})
export class TasksModule {}
