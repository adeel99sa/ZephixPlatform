import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './services/projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { Role } from './entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Team, TeamMember, Role])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
