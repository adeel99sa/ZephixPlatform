import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskManagementController } from './risk-management.controller';
import { RiskManagementService } from './risk-management.service';
import { Project } from '../../projects/entities/project.entity';
import { Risk } from '../entities/risk.entity';
import { RiskAssessment } from '../entities/risk-assessment.entity';
import { RiskResponse } from '../entities/risk-response.entity';
import { RiskMonitoring } from '../entities/risk-monitoring.entity';
// AccessControlModule removed - using built-in NestJS guards instead
import { AIModule } from '../../ai/ai.module';
import { SharedModule } from '../../shared/shared.module';

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
    AIModule, // Provides AI services
    SharedModule, // Provides ClaudeService
  ],
  controllers: [RiskManagementController],
  providers: [RiskManagementService],
  exports: [RiskManagementService],
})
export class RiskManagementModule {}
