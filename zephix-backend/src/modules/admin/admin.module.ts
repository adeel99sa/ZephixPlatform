import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { WorkflowTemplate } from '../workflows/entities/workflow-template.entity';
import { WorkflowInstance } from '../workflows/entities/workflow-instance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Project,
      WorkflowTemplate,
      WorkflowInstance,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
