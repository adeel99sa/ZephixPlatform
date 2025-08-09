import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectsService } from './services/projects.service';
import { RoleSeedService } from './services/role-seed.service';
import { ProjectsController } from './controllers/projects.controller';
import { SharedModule } from '../shared/shared.module';

import { Project } from './entities/project.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { Role } from './entities/role.entity';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([Project, Team, TeamMember, Role])
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, RoleSeedService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
