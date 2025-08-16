import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusReportingController } from './status-reporting.controller';
import { StatusReportingService } from '../services/status-reporting.service';
import { Project } from '../../projects/entities/project.entity';
import { TeamMember } from '../../projects/entities/team-member.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
// AccessControlModule removed - using built-in NestJS guards instead
import { AIModule } from '../../ai/ai.module';

@Module({
  imports: [
    // AccessControlModule removed - using built-in NestJS guards instead
    TypeOrmModule.forFeature([Project, TeamMember, UserOrganization]),
    AIModule, // Provides ClaudeService
  ],
  controllers: [StatusReportingController],
  providers: [StatusReportingService],
  exports: [StatusReportingService],
})
export class StatusReportingModule {}
