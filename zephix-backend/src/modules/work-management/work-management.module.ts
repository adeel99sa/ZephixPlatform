import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkTask } from './entities/work-task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskActivity } from './entities/task-activity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkTask,
      TaskDependency,
      TaskComment,
      TaskActivity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class WorkManagementModule {}

