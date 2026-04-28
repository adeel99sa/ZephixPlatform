import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskManagementController } from './risk-management.controller';
import { RiskManagementService } from './risk-management.service';
import { Project } from '../../modules/projects/entities/project.entity';
import { WorkRisk } from '../../modules/work-management/entities/work-risk.entity';
import { RiskMonitoring } from '../entities/risk-monitoring.entity';
// AccessControlModule removed - using built-in NestJS guards instead
import { AIModule } from '../../ai/ai.module';

@Module({
  imports: [
    // AccessControlModule removed - using built-in NestJS guards instead
    TypeOrmModule.forFeature([Project, WorkRisk, RiskMonitoring]),
    AIModule, // Provides ClaudeService
  ],
  controllers: [RiskManagementController],
  providers: [RiskManagementService],
  exports: [RiskManagementService],
})
export class RiskManagementModule {}
