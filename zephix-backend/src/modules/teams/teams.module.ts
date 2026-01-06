import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { TeamsService } from './teams.service';
import { Project } from '../projects/entities/project.entity';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamMember, Project]),
    TenancyModule, // Required for TenantAwareRepository
  ],
  providers: [
    // Provide TenantAwareRepository for tenant-scoped entities
    createTenantAwareRepositoryProvider(Team),
    createTenantAwareRepositoryProvider(TeamMember),
    createTenantAwareRepositoryProvider(Project), // Project is already workspace-scoped
    TeamsService,
  ],
  exports: [TeamsService],
})
export class TeamsModule {}

