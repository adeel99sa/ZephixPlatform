import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusReportingService } from '../services/status-reporting.service';
import { Project } from '../../modules/projects/entities/project.entity';
// Removed team-related entities - using simplified project assignments
// import { TeamMember } from '../../modules/projects/entities/team-member.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
// AccessControlModule removed - using built-in NestJS guards instead
import { AIModule } from '../../ai/ai.module';

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
      // TeamMember, // Removed - using simplified project assignments
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
