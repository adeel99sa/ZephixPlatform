import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectsService } from './services/projects.service';
import { RoleSeedService } from './services/role-seed.service';
import { ProjectsController } from './controllers/projects.controller';

import { Project } from './entities/project.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { Role } from './entities/role.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Team,
      TeamMember,
      Role,
      UserOrganization,
    ]),
    // OrganizationsModule no longer needed - it's now Global
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, RoleSeedService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
