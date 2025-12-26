import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { ResourceModule } from '../resources/resource.module';
import { KPIModule } from '../kpi/kpi.module';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskDependency]),
    TenancyModule, // Required for TenantAwareRepository
    ResourceModule,
    KPIModule,
  ],
  providers: [
    // Provide TenantAwareRepository for tenant-scoped entities
    createTenantAwareRepositoryProvider(Task),
    createTenantAwareRepositoryProvider(TaskDependency),
    TasksService,
  ],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
