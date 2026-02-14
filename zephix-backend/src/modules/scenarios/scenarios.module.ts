import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScenarioPlan } from './entities/scenario-plan.entity';
import { ScenarioAction } from './entities/scenario-action.entity';
import { ScenarioResult } from './entities/scenario-result.entity';
import { ScenariosService } from './services/scenarios.service';
import { ScenarioComputeService } from './services/scenario-compute.service';
import { ScenariosController } from './controllers/scenarios.controller';
// Cross-module dependencies
import { WorkTask } from '../work-management/entities/work-task.entity';
import { WorkTaskDependency } from '../work-management/entities/task-dependency.entity';
import { WorkResourceAllocation } from '../work-management/entities/work-resource-allocation.entity';
import { Project } from '../projects/entities/project.entity';
import { EarnedValueSnapshot } from '../work-management/entities/earned-value-snapshot.entity';
import { WorkManagementModule } from '../work-management/work-management.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScenarioPlan,
      ScenarioAction,
      ScenarioResult,
      WorkTask,
      WorkTaskDependency,
      WorkResourceAllocation,
      Project,
      EarnedValueSnapshot,
    ]),
    WorkManagementModule,
    WorkspaceAccessModule,
  ],
  controllers: [ScenariosController],
  providers: [ScenariosService, ScenarioComputeService],
  exports: [ScenariosService, ScenarioComputeService],
})
export class ScenariosModule {}
