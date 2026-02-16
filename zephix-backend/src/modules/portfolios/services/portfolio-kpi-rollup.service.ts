import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { createHash } from 'crypto';
import { Portfolio } from '../entities/portfolio.entity';
import { PortfolioProject } from '../entities/portfolio-project.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectKpiValueEntity } from '../../kpis/entities/project-kpi-value.entity';
import { ProjectBudgetEntity } from '../../budgets/entities/project-budget.entity';
import { ChangeRequestEntity } from '../../change-requests/entities/change-request.entity';
import { ChangeRequestStatus } from '../../change-requests/types/change-request.enums';
import { Risk } from '../../risks/entities/risk.entity';

export const PORTFOLIO_ROLLUP_ENGINE_VERSION = '1.0.0';

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

export interface PortfolioKpiRollupResult {
  portfolioId: string;
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

interface PortfolioKpiDef {
  code: string;
  name: string;
  unit: string;
  requiredGovernanceFlag?: string;
  compute: (ctx: RollupContext) => { value: number | null; status: string; detail: Record<string, any> };
}

interface RollupContext {
  projectKpis: Map<string, ProjectKpiValueEntity[]>;
  budgets: ProjectBudgetEntity[];
  changeRequests: ChangeRequestEntity[];
  risks: Risk[];
  projectIds: string[];
}

const PORTFOLIO_KPI_DEFS: PortfolioKpiDef[] = [
  {
    code: 'spi',
    name: 'Schedule Performance Index (Portfolio Weighted)',
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
    name: 'Schedule Variance (Portfolio Sum)',
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
    name: 'Budget Burn Rate (Portfolio Ratio)',
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
    name: 'Forecast at Completion (Portfolio Sum)',
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
    name: 'Open Risk Count (Portfolio Sum)',
    unit: 'count',
    compute: (ctx) => {
      const count = ctx.risks.length;
      return { value: count, status: count > 10 ? 'WARNING' : 'OK', detail: { count } };
    },
  },
  {
    code: 'change_request_approval_rate',
    name: 'Change Request Approval Rate (Portfolio Weighted)',
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
    name: 'Throughput (Portfolio Sum)',
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
    name: 'Work In Progress (Portfolio Sum)',
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
export class PortfolioKpiRollupService {
  private readonly logger = new Logger(PortfolioKpiRollupService.name);

  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepo: Repository<Portfolio>,
    @InjectRepository(PortfolioProject)
    private readonly portfolioProjectRepo: Repository<PortfolioProject>,
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

  async computeForPortfolio(
    workspaceId: string,
    portfolioId: string,
    organizationId: string,
    asOfDate?: string,
  ): Promise<PortfolioKpiRollupResult> {
    const effectiveDate = asOfDate || new Date().toISOString().split('T')[0];

    const portfolio = await this.portfolioRepo.findOne({
      where: { id: portfolioId, organizationId, workspaceId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const projectIds = await this.getPortfolioProjectIds(portfolioId, organizationId, workspaceId);

    const [projectKpis, budgets, changeRequests, risks] = await Promise.all([
      this.loadProjectKpis(projectIds, workspaceId, effectiveDate),
      this.loadBudgets(projectIds, workspaceId),
      this.loadChangeRequests(projectIds, workspaceId),
      this.loadRisks(projectIds, organizationId),
    ]);

    const ctx: RollupContext = { projectKpis, budgets, changeRequests, risks, projectIds };

    const computed: RollupKpi[] = [];
    const skipped: SkippedKpi[] = [];

    for (const def of PORTFOLIO_KPI_DEFS) {
      if (def.requiredGovernanceFlag) {
        const flagValue = (portfolio as any)[def.requiredGovernanceFlag];
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
            engineVersion: PORTFOLIO_ROLLUP_ENGINE_VERSION,
            scope: 'PORTFOLIO',
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
          valueJson: { error: 'COMPUTE_ERROR', engineVersion: PORTFOLIO_ROLLUP_ENGINE_VERSION, scope: 'PORTFOLIO' },
        });
      }
    }

    computed.sort((a, b) => a.kpiCode.localeCompare(b.kpiCode));
    skipped.sort((a, b) => a.kpiCode.localeCompare(b.kpiCode));

    const inputHash = this.computeInputHash(portfolioId, effectiveDate, projectIds, budgets, projectKpis);

    const projectsWithKpis = [...projectKpis.entries()].filter(([, v]) => v.length > 0).length;

    return {
      portfolioId,
      asOfDate: effectiveDate,
      engineVersion: PORTFOLIO_ROLLUP_ENGINE_VERSION,
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

  private async getPortfolioProjectIds(
    portfolioId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<string[]> {
    const directProjects = await this.projectRepo.find({
      where: { portfolioId, organizationId, workspaceId },
      select: ['id'],
    });

    const joinProjects = await this.portfolioProjectRepo.find({
      where: { portfolioId, organizationId },
      relations: ['project'],
    });

    const fromJoin = joinProjects
      .filter((pp) => pp.project?.workspaceId === workspaceId)
      .map((pp) => pp.projectId);

    const allIds = new Set([...directProjects.map((p) => p.id), ...fromJoin]);
    return Array.from(allIds).sort();
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
    portfolioId: string,
    asOfDate: string,
    projectIds: string[],
    budgets: ProjectBudgetEntity[],
    projectKpis: Map<string, ProjectKpiValueEntity[]>,
  ): string {
    const payload = {
      portfolioId,
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
