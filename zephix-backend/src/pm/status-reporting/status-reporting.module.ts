import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusReportingController } from './status-reporting.controller';
import { StatusReportingService } from '../services/status-reporting.service';
import { StatusReport } from '../entities/status-report.entity';
import { ProjectMetrics } from '../entities/project-metrics.entity';
import { PerformanceBaseline } from '../entities/performance-baseline.entity';
import { AlertConfiguration } from '../entities/alert-configuration.entity';
import { ManualUpdate } from '../entities/manual-update.entity';
import { StakeholderCommunication } from '../entities/stakeholder-communication.entity';
import { Project } from '../../projects/entities/project.entity';
import { TeamMember } from '../../projects/entities/team-member.entity';
import { ClaudeService } from '../../ai/claude.service';
import { ProjectPermissionGuard } from '../../projects/guards/project-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StatusReport,
      ProjectMetrics,
      PerformanceBaseline,
      AlertConfiguration,
      ManualUpdate,
      StakeholderCommunication,
      Project,
      TeamMember,
    ]),
  ],
  controllers: [StatusReportingController],
  providers: [
    StatusReportingService,
    ClaudeService,
    ProjectPermissionGuard,
  ],
  exports: [StatusReportingService],
})
export class StatusReportingModule {}
