import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RiskSignal } from './entities/risk-signal.entity';
import { RiskService } from './services/risk.service';
import { Project } from '../../projects/entities/project.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { ResourceAllocation } from '../resources/entities/resource-allocation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RiskSignal, Project, WorkItem, ResourceAllocation]),
    ScheduleModule.forRoot(),
  ],
  providers: [RiskService],
  exports: [RiskService, TypeOrmModule],
})
export class RiskModule {}
