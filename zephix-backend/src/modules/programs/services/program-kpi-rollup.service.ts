import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { createHash } from 'crypto';
import { Program } from '../entities/program.entity';
import { Project } from '../../projects/entities/project.entity';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';
import { ProjectKpiValueEntity } from '../../kpis/entities/project-kpi-value.entity';
import { ProjectBudgetEntity } from '../../budgets/entities/project-budget.entity';
import { ChangeRequestEntity } from '../../change-requests/entities/change-request.entity';
import { ChangeRequestStatus } from '../../change-requests/types/change-request.enums';
import { Risk } from '../../risks/entities/risk.entity';

export const PROGRAM_ROLLUP_ENGINE_VERSION = '1.0.0';

interface RollupKpi {
  kpiCode: string;
  kpiName: string;
  value: number | null;
  unit: string;
  status: 'OK' | 'WARNING' | 'BREACH' | 'NO_DATA';
  valueJson: Record<string, any>;
}

interface SkippedKpi {
  kpiCode: string;
  kpiName: string;
  reason: string;
  governanceFlag?: string;
}

export interface ProgramKpiRollupResult {
  programId: string;
  portfolioId: string | null;
  asOfDate: string;
  engineVersion: string;
  inputHash: string;
  computed: RollupKpi[];
  skipped: SkippedKpi[];
  sources: {
    projectCount: number;
    projectsWithKpis: number;
    budgetsFound: number;
  };
}

interface RollupContext {
  projectKpis: Map<string, ProjectKpiValueEntity[]>;
  budgets: ProjectBudgetEntity[];
  changeRequests: ChangeRequestEntity[];
  risks: Risk[];
  projectIds: string[];
}

interface ProgramKpiDef {
  code: string;
  name: string;
  unit: string;
  requiredGovernanceFlag?: string;
  compute: (ctx: RollupContext) => { value: number | null; status: string; detail: Record<string, any> };
}

const PROGRAM_KPI_DEFS: ProgramKpiDef[] = [
  {
    code: 'spi',
    name: 'Schedule Performance Index (Program Weighted)',
    unit: 'ratio',
    requiredGovernanceFlag: 'baselinesEnabled',
    compute: (ctx) => {
      const values = collectLatestKpiValues(ctx.projectKpis, 'spi');
      if (values.length === 0) return { value: null, status: 'NO_DATA', detail: { projectsWithSpi: 0 } };
      const total = values.reduce((s, v) => s + v, 0);
      const avg = safeDiv(total, values.length);
      return { value: avg, status: ratioStatus(avg), detail: { projectsWithSpi: values.length, sum: total } };
    },
  },
  {
    code: 'schedule_variance',
    name: 'Schedule Variance (Program Sum)',
    unit: 'number',
    requiredGovernanceFlag: 'baselinesEnabled',
    compute: (ctx) => {
      const values = collectLatestKpiValues(ctx.projectKpis, 'schedule_variance');
      if (values.length === 0) return { value: null, status: 'NO_DATA', detail: { projectsWithSv: 0 } };
      const sum = values.reduce((s, v) => s + v, 0);
      return { value: sum, status: sum < 0 ? 'WARNING' : 'OK', detail: { projectsWithSv: values.length, sum } };
    },
  },
  {
    code: 'budget_burn',
    name: 'Budget Burn Rate (Program Ratio)',
    unit: 'ratio',
    requiredGovernanceFlag: 'costTrackingEnabled',
    compute: (ctx) => {
      const totalBaseline = ctx.budgets.reduce((s, b) => s + parseFloat(b.baselineBudget || '0'), 0);
      const totalRevised = ctx.budgets.reduce((s, b) => s + parseFloat(b.revisedBudget || '0'), 0);
      if (totalBaseline === 0) return { value: null, status: 'NO_DATA', detail: { totalBaseline: 0 } };
      const ratio = safeDiv(totalRevised, totalBaseline);
      return { value: ratio, status: ratio !== null && ratio > 1.0 ? 'WARNING' : 'OK', detail: { totalBaseline, totalRevised } };
    },
  },
  {
    code: 'forecast_at_completion',
    name: 'Forecast at Completion (Program Sum)',
    unit: 'currency',
    requiredGovernanceFlag: 'costTrackingEnabled',
    compute: (ctx) => {
      if (ctx.budgets.length === 0) return { value: null, status: 'NO_DATA', detail: {} };
      const totalFac = ctx.budgets.reduce((s, b) => s + parseFloat(b.forecastAtCompletion || '0'), 0);
      return { value: totalFac, status: 'OK', detail: { budgetCount: ctx.budgets.length, totalFac } };
    },
  },
  {
    code: 'open_risk_count',
    name: 'Open Risk Count (Program Sum)',
    unit: 'count',
    compute: (ctx) => {
      const count = ctx.risks.length;
      return { value: count, status: count > 10 ? 'WARNING' : 'OK', detail: { count } };
    },
  },
  {
    code: 'change_request_approval_rate',
    name: 'Change Request Approval Rate (Program Weighted)',
    unit: 'ratio',
    requiredGovernanceFlag: 'changeManagementEnabled',
    compute: (ctx) => {
      const total = ctx.changeRequests.length;
      if (total === 0) return { value: null, status: 'NO_DATA', detail: { totalCrs: 0 } };
      const decided = ctx.changeRequests.filter(
        (cr) => cr.status === ChangeRequestStatus.APPROVED || cr.status === ChangeRequestStatus.REJECTED,
      );
      const approved = ctx.changeRequests.filter((cr) => cr.status === ChangeRequestStatus.APPROVED);
      if (decided.length === 0) return { value: null, status: 'NO_DATA', detail: { totalCrs: total, decidedCrs: 0 } };
      const rate = safeDiv(approved.length, decided.length);
      return { value: rate, status: 'OK', detail: { totalCrs: total, decidedCrs: decided.length, approvedCrs: approved.length } };
    },
  },
  {
    code: 'throughput',
    name: 'Throughput (Program Sum)',
    unit: 'count',
    compute: (ctx) => {
      const values = collectLatestKpiValues(ctx.projectKpis, 'throughput');
      if (values.length === 0) return { value: null, status: 'NO_DATA', detail: { projectsWithThroughput: 0 } };
      const sum = values.reduce((s, v) => s + v, 0);
      return { value: sum, status: 'OK', detail: { projectsWithThroughput: values.length, sum } };
    },
  },
  {
    code: 'wip',
    name: 'Work In Progress (Program Sum)',
    unit: 'count',
    compute: (ctx) => {
      const values = collectLatestKpiValues(ctx.projectKpis, 'wip');
      if (values.length === 0) return { value: null, status: 'NO_DATA', detail: { projectsWithWip: 0 } };
      const sum = values.reduce((s, v) => s + v, 0);
      return { value: sum, status: 'OK', detail: { projectsWithWip: values.length, sum } };
    },
  },
];

function safeDiv(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function ratioStatus(v: number | null): 'OK' | 'WARNING' | 'BREACH' | 'NO_DATA' {
  if (v === null) return 'NO_DATA';
  if (v >= 0.95) return 'OK';
  if (v >= 0.8) return 'WARNING';
  return 'BREACH';
}

function collectLatestKpiValues(
  projectKpis: Map<string, ProjectKpiValueEntity[]>,
  kpiCode: string,
): number[] {
  const results: number[] = [];
  for (const [, values] of projectKpis) {
    const match = values.find((v) => v.valueJson?.kpiCode === kpiCode || (v as any)._kpiCode === kpiCode);
    if (match && match.valueNumeric != null) {
      results.push(parseFloat(String(match.valueNumeric)));
    }
  }
  return results;
}

@Injectable()
export class ProgramKpiRollupService {
  private readonly logger = new Logger(ProgramKpiRollupService.name);

  constructor(
    @InjectRepository(Program)
    private readonly programRepo: Repository<Program>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepo: Repository<Portfolio>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectKpiValueEntity)
    private readonly kpiValueRepo: Repository<ProjectKpiValueEntity>,
    @InjectRepository(ProjectBudgetEntity)
    private readonly budgetRepo: Repository<ProjectBudgetEntity>,
    @InjectRepository(ChangeRequestEntity)
    private readonly crRepo: Repository<ChangeRequestEntity>,
    @InjectRepository(Risk)
    private readonly riskRepo: Repository<Risk>,
  ) {}

  async computeForProgram(
    workspaceId: string,
    programId: string,
    organizationId: string,
    asOfDate?: string,
  ): Promise<ProgramKpiRollupResult> {
    const effectiveDate = asOfDate || new Date().toISOString().split('T')[0];

    const program = await this.programRepo.findOne({
      where: { id: programId, organizationId, workspaceId },
    });
    if (!program) throw new NotFoundException('Program not found');

    const projectIds = await this.getProgramProjectIds(programId, organizationId, workspaceId);

    const [projectKpis, budgets, changeRequests, risks] = await Promise.all([
      this.loadProjectKpis(projectIds, workspaceId, effectiveDate),
      this.loadBudgets(projectIds, workspaceId),
      this.loadChangeRequests(projectIds, workspaceId),
      this.loadRisks(projectIds, organizationId),
    ]);

    const ctx: RollupContext = { projectKpis, budgets, changeRequests, risks, projectIds };

    const govFlags = await this.resolveGovernanceFlags(program);

    const computed: RollupKpi[] = [];
    const skipped: SkippedKpi[] = [];

    for (const def of PROGRAM_KPI_DEFS) {
      if (def.requiredGovernanceFlag) {
        const flagValue = (govFlags as any)[def.requiredGovernanceFlag];
        if (!flagValue) {
          skipped.push({
            kpiCode: def.code,
            kpiName: def.name,
            reason: 'GOVERNANCE_FLAG_DISABLED',
            governanceFlag: def.requiredGovernanceFlag,
          });
          continue;
        }
      }

      try {
        const result = def.compute(ctx);
        computed.push({
          kpiCode: def.code,
          kpiName: def.name,
          value: result.value,
          unit: def.unit,
          status: result.status as any,
          valueJson: {
            ...result.detail,
            engineVersion: PROGRAM_ROLLUP_ENGINE_VERSION,
            scope: 'PROGRAM',
          },
        });
      } catch (err) {
        this.logger.warn(`KPI compute error for ${def.code}: ${err}`);
        computed.push({
          kpiCode: def.code,
          kpiName: def.name,
          value: null,
          unit: def.unit,
          status: 'NO_DATA',
          valueJson: { error: 'COMPUTE_ERROR', engineVersion: PROGRAM_ROLLUP_ENGINE_VERSION, scope: 'PROGRAM' },
        });
      }
    }

    computed.sort((a, b) => a.kpiCode.localeCompare(b.kpiCode));
    skipped.sort((a, b) => a.kpiCode.localeCompare(b.kpiCode));

    const inputHash = this.computeInputHash(programId, effectiveDate, projectIds, budgets, projectKpis);

    const projectsWithKpis = [...projectKpis.entries()].filter(([, v]) => v.length > 0).length;

    return {
      programId,
      portfolioId: program.portfolioId || null,
      asOfDate: effectiveDate,
      engineVersion: PROGRAM_ROLLUP_ENGINE_VERSION,
      inputHash,
      computed,
      skipped,
      sources: {
        projectCount: projectIds.length,
        projectsWithKpis,
        budgetsFound: budgets.length,
      },
    };
  }

  /**
   * Governance for programs: inherit from portfolio if program belongs to one.
   * Otherwise, default all flags to false (conservative — prevents exposing
   * KPIs that depend on data the program does not have).
   */
  private async resolveGovernanceFlags(
    program: Program,
  ): Promise<Record<string, boolean>> {
    if (program.portfolioId) {
      const portfolio = await this.portfolioRepo.findOne({
        where: { id: program.portfolioId },
      });
      if (portfolio) {
        return {
          costTrackingEnabled: portfolio.costTrackingEnabled,
          baselinesEnabled: portfolio.baselinesEnabled,
          iterationsEnabled: portfolio.iterationsEnabled,
          changeManagementEnabled: portfolio.changeManagementEnabled,
        };
      }
    }
    return {
      costTrackingEnabled: false,
      baselinesEnabled: false,
      iterationsEnabled: false,
      changeManagementEnabled: false,
    };
  }

  private async getProgramProjectIds(
    programId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<string[]> {
    const projects = await this.projectRepo.find({
      where: { programId, organizationId, workspaceId },
      select: ['id'],
    });
    return projects.map((p) => p.id).sort();
  }

  private async loadProjectKpis(
    projectIds: string[],
    workspaceId: string,
    asOfDate: string,
  ): Promise<Map<string, ProjectKpiValueEntity[]>> {
    const result = new Map<string, ProjectKpiValueEntity[]>();
    if (projectIds.length === 0) return result;

    const values = await this.kpiValueRepo.find({
      where: {
        workspaceId,
        projectId: In(projectIds),
        asOfDate: LessThanOrEqual(asOfDate),
      },
      relations: ['kpiDefinition'],
      order: { asOfDate: 'DESC' },
    });

    for (const v of values) {
      const code = v.kpiDefinition?.code ?? '';
      (v as any)._kpiCode = code;
    }

    for (const pid of projectIds) {
      const projectValues = values.filter((v) => v.projectId === pid);
      const latestByCode = new Map<string, ProjectKpiValueEntity>();
      for (const v of projectValues) {
        const code = (v as any)._kpiCode;
        if (code && !latestByCode.has(code)) {
          latestByCode.set(code, v);
        }
      }
      result.set(pid, Array.from(latestByCode.values()));
    }
    return result;
  }

  private async loadBudgets(projectIds: string[], workspaceId: string): Promise<ProjectBudgetEntity[]> {
    if (projectIds.length === 0) return [];
    return this.budgetRepo.find({
      where: { workspaceId, projectId: In(projectIds) },
    });
  }

  private async loadChangeRequests(projectIds: string[], workspaceId: string): Promise<ChangeRequestEntity[]> {
    if (projectIds.length === 0) return [];
    return this.crRepo.find({
      where: { workspaceId, projectId: In(projectIds) },
    });
  }

  private async loadRisks(projectIds: string[], organizationId: string): Promise<Risk[]> {
    if (projectIds.length === 0) return [];
    return this.riskRepo.find({
      where: { projectId: In(projectIds), organizationId, status: 'open' },
    });
  }

  private computeInputHash(
    programId: string,
    asOfDate: string,
    projectIds: string[],
    budgets: ProjectBudgetEntity[],
    projectKpis: Map<string, ProjectKpiValueEntity[]>,
  ): string {
    const payload = {
      programId,
      asOfDate,
      projectIds,
      budgetIds: budgets.map((b) => b.id).sort(),
      kpiValueIds: [...projectKpis.values()]
        .flat()
        .map((v) => v.id)
        .sort(),
    };
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
  }
}
