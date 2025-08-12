import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BRD } from './entities/brd.entity';
import { BRDAnalysis } from './entities/brd-analysis.entity';
import { GeneratedProjectPlan } from './entities/generated-project-plan.entity';
import { BRDController } from './controllers/brd.controller';
import { BRDProjectPlanningController } from './controllers/brd-project-planning.controller';
import { BRDService } from './services/brd.service';
import { BRDAnalysisService } from './services/brd-analysis.service';
import { BRDRepository } from './repositories/brd.repository';
// AccessControlModule removed - using built-in NestJS guards instead
import { UserOrganization } from '../organizations/entities/user-organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BRD, BRDAnalysis, GeneratedProjectPlan, UserOrganization]),
    // AccessControlModule removed - using built-in NestJS guards instead
  ],
  controllers: [BRDController, BRDProjectPlanningController],
  providers: [
    BRDService,
    BRDAnalysisService,
    BRDRepository,
  ],
  exports: [
    BRDService,
    BRDAnalysisService,
    BRDRepository,
  ],
})
export class BRDModule {}