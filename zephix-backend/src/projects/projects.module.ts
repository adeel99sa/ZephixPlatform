import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectsService } from './services/projects.service';
import { RoleSeedService } from './services/role-seed.service';
import { SampleDataService } from './services/sample-data.service';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectPermissionGuard } from './guards/project-permission.guard';

import { Project } from './entities/project.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { Role } from './entities/role.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Team, TeamMember, Role, User]),
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    RoleSeedService,
    SampleDataService,
    ProjectPermissionGuard,
  ],
  exports: [ProjectsService, ProjectPermissionGuard],
})
export class ProjectsModule {} 