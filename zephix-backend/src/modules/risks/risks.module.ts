import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RisksService } from './risks.service';
import { RisksController } from './risks.controller';
import { Risk } from './entities/risk.entity';
import { RiskMitigation } from './entities/risk-mitigation.entity';
import { RiskImpact } from './entities/risk-impact.entity';
import { RiskTrigger } from './entities/risk-trigger.entity';
import { ProjectsModule } from '../projects/projects.module';
import { ResourceModule } from '../resources/resource.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Risk, RiskMitigation, RiskImpact, RiskTrigger]),
    ProjectsModule,
    ResourceModule,
  ],
  controllers: [RisksController],
  providers: [RisksService],
  exports: [RisksService],
})
export class RisksModule {}
