import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { ResourceModule } from '../resources/resource.module';
import { KPIModule } from '../kpi/kpi.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskDependency]),
    ResourceModule,
    KPIModule,
    AuthModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
