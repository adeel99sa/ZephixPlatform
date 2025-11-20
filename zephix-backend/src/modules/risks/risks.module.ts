import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskManagementController } from './controllers/risks.controller';
import { RiskManagementService } from './services/risks.service';
import { RiskDetectionService } from './services/risk-detection.service';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { ResourceAllocation } from '../resources/entities/resource-allocation.entity';
import { Risk } from './entities/risk.entity';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { RiskResponse } from './entities/risk-response.entity';
import { RiskMonitoring } from './entities/risk-monitoring.entity';
import { AIModule } from '../../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Task,
      ResourceAllocation,
      Risk,
      RiskAssessment,
      RiskResponse,
      RiskMonitoring,
    ]),
    AIModule,
  ],
  controllers: [RiskManagementController],
  providers: [RiskManagementService, RiskDetectionService],
  exports: [RiskManagementService, RiskDetectionService],
})
export class RisksModule {}
