import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskManagementController } from './risk-management.controller';
import { RiskManagementService } from './risk-management.service';
import { Project } from '../../modules/projects/entities/project.entity';
import { WorkRisk } from '../../modules/work-management/entities/work-risk.entity';
import { RiskMonitoring } from '../entities/risk-monitoring.entity';
import { Risk } from '../entities/risk.entity';
import { RiskResponse } from '../entities/risk-response.entity';
// AccessControlModule removed - using built-in NestJS guards instead
import { AIModule } from '../../ai/ai.module';

@Module({
  imports: [
    // AccessControlModule removed - using built-in NestJS guards instead
    // Risk + RiskResponse: relation graph for RiskMonitoring#risk and Risk#responses
    // when autoLoadEntities replaces entity globs (permission-matrix Jest — ded9bf19).
    TypeOrmModule.forFeature([
      Project,
      WorkRisk,
      RiskMonitoring,
      Risk,
      RiskResponse,
    ]),
    AIModule, // Provides ClaudeService
  ],
  controllers: [RiskManagementController],
  providers: [RiskManagementService],
  exports: [RiskManagementService],
})
export class RiskManagementModule {}
