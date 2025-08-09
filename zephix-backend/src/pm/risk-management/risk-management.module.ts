import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskManagementController } from './risk-management.controller';
import { RiskManagementService } from './risk-management.service';
import { Risk } from '../entities/risk.entity';
import { RiskAssessment } from '../entities/risk-assessment.entity';
import { RiskResponse } from '../entities/risk-response.entity';
import { RiskMonitoring } from '../entities/risk-monitoring.entity';
import { Project } from '../../projects/entities/project.entity';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([
      Risk,
      RiskAssessment,
      RiskResponse,
      RiskMonitoring,
      Project,
    ]),
  ],
  controllers: [RiskManagementController],
  providers: [RiskManagementService],
  exports: [RiskManagementService],
})
export class RiskManagementModule {}
