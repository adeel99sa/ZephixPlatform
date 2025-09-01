import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../modules/users/entities/user.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { WorkflowTemplate } from '../pm/entities/workflow-template.entity';
import { WorkflowInstance } from '../pm/entities/workflow-instance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Project, WorkflowTemplate, WorkflowInstance]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
