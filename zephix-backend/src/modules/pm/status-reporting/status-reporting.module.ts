import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusReportingService } from '../services/status-reporting.service';
import { Project } from '../../projects/entities/project.entity';
import { TeamMember } from '../../projects/entities/team-member.entity';
import { UserOrganization } from '../modules/organizations/entities/user-organization.entity';
// AccessControlModule removed - using built-in NestJS guards instead
import { AIModule } from '../../ai-assistant/ai.module';

// Import all required entities for StatusReportingService
import { StatusReport } from './entities/status-report.entity';
import { ProjectMetrics } from '../entities/project-metrics.entity';
import { PerformanceBaseline } from '../entities/performance-baseline.entity';
import { AlertConfiguration } from '../entities/alert-configuration.entity';
import { ManualUpdate } from '../entities/manual-update.entity';
import { StakeholderCommunication } from '../entities/stakeholder-communication.entity';

@Module({
  imports: [
    // AccessControlModule removed - using built-in NestJS guards instead
    TypeOrmModule.forFeature([
      Project,
      TeamMember,
      UserOrganization,
      // Status Reporting Entities
      StatusReport,
      ProjectMetrics,
      PerformanceBaseline,
      AlertConfiguration,
      ManualUpdate,
      StakeholderCommunication,
    ]),
    AIModule, // Provides ClaudeService
  ],
  providers: [StatusReportingService],
  exports: [StatusReportingService],
})
export class StatusReportingModule {}
