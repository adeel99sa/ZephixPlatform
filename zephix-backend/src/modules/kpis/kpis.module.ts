import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KpiDefinitionEntity } from './entities/kpi-definition.entity';
import { ProjectKpiConfigEntity } from './entities/project-kpi-config.entity';
import { ProjectKpiValueEntity } from './entities/project-kpi-value.entity';
import { TemplateKpiEntity } from './entities/template-kpi.entity';

import { WorkTask } from '../work-management/entities/work-task.entity';
import { Iteration } from '../work-management/entities/iteration.entity';
import { WorkRisk } from '../work-management/entities/work-risk.entity';
import { ProjectBudgetEntity } from '../budgets/entities/project-budget.entity';
import { Project } from '../projects/entities/project.entity';
import { EarnedValueSnapshot } from '../work-management/entities/earned-value-snapshot.entity';
import { ChangeRequestEntity } from '../change-requests/entities/change-request.entity';

import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';

import { KpiDefinitionsService } from './services/kpi-definitions.service';
import { ProjectKpiConfigsService } from './services/project-kpi-configs.service';
import { ProjectKpiValuesService } from './services/project-kpi-values.service';
import { ProjectKpiComputeService } from './services/project-kpi-compute.service';
import { TemplateKpisService } from './services/template-kpis.service';

import { ProjectKpisController } from './controllers/project-kpis.controller';
import { TemplateKpisController } from './controllers/template-kpis.controller';
import { KpiDefinitionsController } from './controllers/kpi-definitions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KpiDefinitionEntity,
      ProjectKpiConfigEntity,
      ProjectKpiValueEntity,
      TemplateKpiEntity,
      WorkTask,
      Iteration,
      WorkRisk,
      ProjectBudgetEntity,
      Project,
      EarnedValueSnapshot,
      ChangeRequestEntity,
    ]),
    WorkspaceAccessModule,
  ],
  controllers: [ProjectKpisController, TemplateKpisController, KpiDefinitionsController],
  providers: [
    KpiDefinitionsService,
    ProjectKpiConfigsService,
    ProjectKpiValuesService,
    ProjectKpiComputeService,
    TemplateKpisService,
  ],
  exports: [
    KpiDefinitionsService,
    ProjectKpiConfigsService,
    ProjectKpiValuesService,
    TemplateKpisService, // Wave 4B: Exported for template instantiation hooks
  ],
})
export class KpisModule {}
