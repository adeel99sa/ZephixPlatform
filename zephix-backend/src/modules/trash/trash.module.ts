import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrashService } from './trash.service';
import { TrashController } from './trash.controller';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Team } from '../teams/entities/team.entity';
import { Risk } from '../risks/entities/risk.entity';
import { Resource } from '../resources/entities/resource.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Task,
      Workspace,
      Team,
      Risk,
      Resource,
      User,
    ]),
  ],
  controllers: [TrashController],
  providers: [TrashService],
  exports: [TrashService],
})
export class TrashModule {}

