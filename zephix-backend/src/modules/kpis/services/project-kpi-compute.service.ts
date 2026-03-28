import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { Iteration } from '../../work-management/entities/iteration.entity';
import { WorkRisk, RiskStatus } from '../../work-management/entities/work-risk.entity';
import { ProjectBudgetEntity } from '../../budgets/entities/project-budget.entity';
import { Project } from '../../projects/entities/project.entity';
import { EarnedValueSnapshot } from '../../work-management/entities/earned-value-snapshot.entity';
import { ChangeRequestEntity } from '../../change-requests/entities/change-request.entity';
import { ProjectKpiConfigsService } from './project-kpi-configs.service';
import { ProjectKpiValuesService } from './project-kpi-values.service';
import { ProjectKpiValueEntity } from '../entities/project-kpi-value.entity';
import {
  calcWip,
  calcThroughput,
  calcCycleTime,
  calcVelocity,
  calcBudgetBurn,
  calcForecastAtCompletion,
  calcScheduleVariance,
  calcSpi,
  calcChangeRequestCycleTime,
  calcChangeRequestApprovalRate,
  calcOpenRiskCount,
  calcEscapedDefects,
  TaskSnapshot,
  IterationSnapshot,
  BudgetSnapshot,
  ProjectCostSnapshot,
  EvSnapshot,
  ChangeRequestSnapshot,
} from '../engine/kpi-calculators';

@Injectable()
export class ProjectKpiComputeService {
  private readonly logger = new Logger(ProjectKpiComputeService.name);

  constructor(
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(Iteration)
    private readonly iterationRepo: Repository<Iteration>,
    @InjectRepository(WorkRisk)
    private readonly riskRepo: Repository<WorkRisk>,
    @InjectRepository(ProjectBudgetEntity)
    private readonly budgetRepo: Repository<ProjectBudgetEntity>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(EarnedValueSnapshot)
    private readonly evRepo: Repository<EarnedValueSnapshot>,
    @InjectRepository(ChangeRequestEntity)
    private readonly crRepo: Repository<ChangeRequestEntity>,
    private readonly configsService: ProjectKpiConfigsService,
    private readonly valuesService: ProjectKpiValuesService,
  ) {}

  /**
   * Compute all enabled KPIs for a project and persist values for today.
   * Returns structured result with computed values AND skipped KPIs with reasons.
   */
  async computeForProject(
    workspaceId: string,
    projectId: string,
  ): Promise<ComputeResult> {
    const enabledConfigs = await this.configsService.getEnabledConfigs(
      workspaceId,
      projectId,
    );

    if (enabledConfigs.length === 0) {
      this.logger.log(`No enabled KPIs for project ${projectId}`);
      return { computed: [], skipped: [] };
    }

    // ── Governance flag enforcement at compute time ───────────────────
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    const govFlags: Record<string, boolean> = {
      iterationsEnabled: project?.iterationsEnabled ?? false,
      costTrackingEnabled: project?.costTrackingEnabled ?? false,
      baselinesEnabled: project?.baselinesEnabled ?? false,
      earnedValueEnabled: project?.earnedValueEnabled ?? false,
      capacityEnabled: project?.capacityEnabled ?? false,
      changeManagementEnabled: project?.changeManagementEnabled ?? false,
    };

    const governedConfigs: typeof enabledConfigs = [];
    const skipped: SkippedKpi[] = [];

    for (const config of enabledConfigs) {
      const flag = config.kpiDefinition?.requiredGovernanceFlag;
      if (!flag) {
        governedConfigs.push(config);
        continue;
      }
      if (!govFlags[flag]) {
        skipped.push({
          kpiCode: config.kpiDefinition?.code ?? 'unknown',
          kpiName: config.kpiDefinition?.name ?? 'unknown',
          reason: 'GOVERNANCE_FLAG_DISABLED',
          governanceFlag: flag,
        });
        this.logger.warn(
          `Skipping KPI "${config.kpiDefinition?.code}" — governance flag "${flag}" is disabled on project ${projectId}`,
        );
        continue;
      }
      governedConfigs.push(config);
    }

    if (governedConfigs.length === 0) {
      this.logger.log(`All enabled KPIs blocked by governance flags for project ${projectId}`);
      return { computed: [], skipped };
    }

    const today = new Date().toISOString().slice(0, 10);
    const strategies = new Set(
      governedConfigs.map((c) => c.kpiDefinition?.calculationStrategy),
    );

    const data = await this.fetchComputeData(
      workspaceId,
      projectId,
      strategies,
    );

    const computed: ProjectKpiValueEntity[] = [];

    for (const config of governedConfigs) {
      const strategy = config.kpiDefinition?.calculationStrategy;
      if (!strategy) continue;

      const calcResult = this.runCalculator(strategy, data);

      // Add inputHash to valueJson for audit traceability
      const inputKey = this.getInputKey(strategy, data);
      if (calcResult.valueJson) {
        calcResult.valueJson.inputHash = inputKey;
      }

      const value = await this.valuesService.upsertValue(
        workspaceId,
        projectId,
        config.kpiDefinitionId,
        today,
        calcResult,
      );
      computed.push(value);
    }

    // Stable sort by kpiCode for deterministic response ordering
    computed.sort((a, b) => {
      const codeA = governedConfigs.find(c => c.kpiDefinitionId === a.kpiDefinitionId)?.kpiDefinition?.code ?? '';
      const codeB = governedConfigs.find(c => c.kpiDefinitionId === b.kpiDefinitionId)?.kpiDefinition?.code ?? '';
      return codeA.localeCompare(codeB);
    });
    skipped.sort((a, b) => a.kpiCode.localeCompare(b.kpiCode));

    this.logger.log(
      `Computed ${computed.length} KPI values for project ${projectId}, skipped ${skipped.length}`,
    );
    return { computed, skipped };
  }

  /**
   * Deterministic hash of normalized inputs for audit trail.
   * Allows later comparison of why two runs differ.
   */
  private getInputKey(strategy: string, data: ComputeData): string {
    let payload: any;
    switch (strategy) {
      case 'wip':
      case 'throughput':
      case 'cycle_time':
        payload = (data.tasks ?? []).map((t) => ({
          s: t.status,
          a: t.actualStartAt?.toString() ?? null,
          c: t.completedAt?.toString() ?? null,
        }));
        break;
      case 'velocity':
        payload = (data.iterations ?? []).map((i) => ({
          id: i.id,
          s: i.status,
          p: i.completedPoints,
        }));
        break;
      case 'budget_burn':
      case 'forecast_at_completion':
        payload = { b: data.budget, pc: data.projectCost };
        break;
      case 'schedule_variance':
      case 'spi':
        payload = data.evSnapshot;
        break;
      case 'change_request_cycle_time':
      case 'change_request_approval_rate':
        payload = (data.changeRequests ?? []).map((cr) => ({
          s: cr.status,
          c: cr.createdAt?.toString(),
          a: cr.approvedAt?.toString() ?? null,
        }));
        break;
      case 'open_risk_count':
        payload = { count: data.openRiskCount };
        break;
      default:
        payload = null;
    }
    const json = JSON.stringify(payload ?? 'empty');
    return crypto.createHash('sha256').update(json).digest('hex').slice(0, 16);
  }

  private async fetchComputeData(
    workspaceId: string,
    projectId: string,
    strategies: Set<string | undefined>,
  ): Promise<ComputeData> {
    const data: ComputeData = {};

    const needsTasks =
      strategies.has('wip') ||
      strategies.has('throughput') ||
      strategies.has('cycle_time');

    if (needsTasks) {
      const tasks = await this.taskRepo.find({
        where: { workspaceId, projectId, deletedAt: undefined },
        select: ['status', 'actualStartAt', 'completedAt', 'estimatePoints'],
      });
      data.tasks = tasks.map((t) => ({
        status: t.status,
        actualStartAt: t.actualStartAt,
        completedAt: t.completedAt,
        estimatePoints: t.estimatePoints,
      }));
    }

    if (strategies.has('velocity')) {
      const iters = await this.iterationRepo.find({
        where: { workspaceId, projectId },
        select: ['id', 'name', 'status', 'completedPoints'],
      });
      data.iterations = iters.map((i) => ({
        id: i.id,
        name: i.name,
        status: i.status,
        completedPoints: i.completedPoints,
      }));
    }

    if (
      strategies.has('budget_burn') ||
      strategies.has('forecast_at_completion')
    ) {
      const budget = await this.budgetRepo.findOne({
        where: { workspaceId, projectId },
      });
      data.budget = budget
        ? {
            baselineBudget: budget.baselineBudget,
            revisedBudget: budget.revisedBudget,
            forecastAtCompletion: budget.forecastAtCompletion,
          }
        : null;

      if (strategies.has('budget_burn')) {
        const proj = await this.projectRepo.findOne({
          where: { id: projectId },
          select: ['id', 'actualCost'],
        });
        data.projectCost = proj
          ? { actualCost: proj.actualCost }
          : null;
      }
    }

    if (
      strategies.has('schedule_variance') ||
      strategies.has('spi')
    ) {
      const snapshot = await this.evRepo.findOne({
        where: { projectId },
        order: { asOfDate: 'DESC' },
      });
      data.evSnapshot = snapshot
        ? { ev: snapshot.ev, pv: snapshot.pv }
        : null;
    }

    if (
      strategies.has('change_request_cycle_time') ||
      strategies.has('change_request_approval_rate')
    ) {
      const crs = await this.crRepo.find({
        where: { workspaceId, projectId },
        select: ['status', 'createdAt', 'approvedAt'],
      });
      data.changeRequests = crs.map((cr) => ({
        status: cr.status,
        createdAt: cr.createdAt,
        approvedAt: cr.approvedAt,
      }));
    }

    if (strategies.has('open_risk_count')) {
      const count = await this.riskRepo.count({
        where: { workspaceId, projectId, status: RiskStatus.OPEN },
      });
      data.openRiskCount = count;
    }

    return data;
  }

  private runCalculator(
    strategy: string,
    data: ComputeData,
  ) {
    switch (strategy) {
      case 'wip':
        return calcWip(data.tasks ?? []);
      case 'throughput':
        return calcThroughput(data.tasks ?? []);
      case 'cycle_time':
        return calcCycleTime(data.tasks ?? []);
      case 'velocity':
        return calcVelocity(data.iterations ?? []);
      case 'budget_burn':
        return calcBudgetBurn(data.budget ?? null, data.projectCost ?? null);
      case 'forecast_at_completion':
        return calcForecastAtCompletion(data.budget ?? null);
      case 'schedule_variance':
        return calcScheduleVariance(data.evSnapshot ?? null);
      case 'spi':
        return calcSpi(data.evSnapshot ?? null);
      case 'change_request_cycle_time':
        return calcChangeRequestCycleTime(data.changeRequests ?? []);
      case 'change_request_approval_rate':
        return calcChangeRequestApprovalRate(data.changeRequests ?? []);
      case 'open_risk_count':
        return calcOpenRiskCount(data.openRiskCount ?? 0);
      case 'escaped_defects':
        return calcEscapedDefects();
      default:
        this.logger.warn(`Unknown calculation strategy: ${strategy}`);
        return calcEscapedDefects();
    }
  }
}

interface ComputeData {
  tasks?: TaskSnapshot[];
  iterations?: IterationSnapshot[];
  budget?: BudgetSnapshot | null;
  projectCost?: ProjectCostSnapshot | null;
  evSnapshot?: EvSnapshot | null;
  changeRequests?: ChangeRequestSnapshot[];
  openRiskCount?: number;
}

export interface SkippedKpi {
  kpiCode: string;
  kpiName: string;
  reason: 'GOVERNANCE_FLAG_DISABLED';
  governanceFlag: string;
}

export interface ComputeResult {
  computed: ProjectKpiValueEntity[];
  skipped: SkippedKpi[];
}
