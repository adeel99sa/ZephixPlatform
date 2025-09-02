import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Risk } from './entities/risk.entity';
import { Project } from '../projects/entities/project.entity';
import { ResourceAllocation } from '../resources/entities/resource-allocation.entity';
import { RiskDetectionService } from './services/risk-detection.service';
import { RisksController } from './controllers/risks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Risk, Project, ResourceAllocation])],
  controllers: [RisksController],
  providers: [RiskDetectionService],
  exports: [RiskDetectionService],
})
export class RisksModule {}
