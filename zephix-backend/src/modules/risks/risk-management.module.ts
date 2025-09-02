import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskManagementController } from './risk-management.controller';
import { RiskManagementService } from './risk-management.service';
import { Project } from '../../modules/projects/entities/project.entity';
import { Risk } from '../entities/risk.entity';
import { RiskAssessment } from '../entities/risk-assessment.entity';
import { RiskResponse } from '../entities/risk-response.entity';
import { RiskMonitoring } from '../entities/risk-monitoring.entity';
// AccessControlModule removed - using built-in NestJS guards instead
import { AIModule } from '../../modules/ai-assistant/ai.module';

@Module({
  imports: [
    // AccessControlModule removed - using built-in NestJS guards instead
    TypeOrmModule.forFeature([
      Project,
      Risk,
      RiskAssessment,
      RiskResponse,
      RiskMonitoring,
    ]),
    AIModule, // Provides ClaudeService
  ],
  controllers: [RiskManagementController],
  providers: [RiskManagementService],
  exports: [RiskManagementService],
})
export class RiskManagementModule {}
