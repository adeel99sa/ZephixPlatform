/**
 * Phase 2D: Portfolio Analytics Service
 *
 * Executive-level cross-project visibility.
 * All read-only. All scoped by organizationId.
 * CPI/SPI weighted by BAC. Risk thresholds configurable.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Portfolio } from '../entities/portfolio.entity';
import { PortfolioProject } from '../entities/portfolio-project.entity';
import { Project } from '../../projects/entities/project.entity';
import { EarnedValueSnapshot } from '../../work-management/entities/earned-value-snapshot.entity';
import { ScheduleBaseline } from '../../work-management/entities/schedule-baseline.entity';
import { BaselineService, BaselineCompareResult } from '../../work-management/services/baseline.service';
import { ProjectBudgetEntity } from '../../budgets/entities/project-budget.entity';

// ── Configurable risk thresholds — no magic numbers ─────────────────────
export const RISK_THRESHOLDS = {
  CPI: 0.9,
  SPI: 0.9,
};

// ── Response types ──────────────────────────────────────────────────────

export interface PortfolioHealthResult {
  portfolioId: string;
  portfolioName: string;
  projectCount: number;
  /** Number of projects eligible for BAC-weighted CPI/SPI aggregation (has EV snapshot + BAC > 0) */
  evEligibleCount: number;
  totalBudget: number;
  totalActualCost: number;
  aggregateCPI: number | null;
  aggregateSPI: number | null;
  averageScheduleVarianceMinutes: number;
  criticalProjectsCount: number;
  atRiskProjectsCount: number;
  projects: PortfolioProjectHealth[];
}

export interface PortfolioProjectHealth {
  projectId: string;
  projectName: string;
  budget: number;
  actualCost: number;
  cpi: number | null;
  spi: number | null;
  isAtRisk: boolean;
  riskReasons: string[];
  /** False when project has no EV snapshot or BAC=0 — excluded from portfolio CPI/SPI weighting */
  evEligible: boolean;
}

export interface PortfolioCriticalPathRiskResult {
  portfolioId: string;
  totalProjects: number;
  projectsWithSlip: number;
  projects: Array<{
    projectId: string;
    projectName: string;
    criticalPathSlipMinutes: number;
    maxTaskSlipMinutes: number;
    countLate: number;
  }>;
}

export interface PortfolioBaselineDriftResult {
  portfolioId: string;
  totalProjects: number;
  projectsWithBaseline: number;
  averageEndVarianceMinutes: number;
  projects: Array<{
    projectId: string;
    projectName: string;
    baselineId: string;
    baselineName: string;
    countLate: number;
    maxSlipMinutes: number;
    criticalPathSlipMinutes: number;
  }>;
}

@Injectable()
export class PortfolioAnalyticsService {
  private readonly logger = new Logger(PortfolioAnalyticsService.name);

  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepo: Repository<Portfolio>,
    @InjectRepository(PortfolioProject)
    private readonly ppRepo: Repository<PortfolioProject>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(EarnedValueSnapshot)
    private readonly evSnapshotRepo: Repository<EarnedValueSnapshot>,
    @InjectRepository(ScheduleBaseline)
    private readonly baselineRepo: Repository<ScheduleBaseline>,
    @InjectRepository(ProjectBudgetEntity)
    private readonly budgetRepo: Repository<ProjectBudgetEntity>,
    private readonly baselineService: BaselineService,
  ) {}

  // ── 1. getPortfolioHealth ──────────────────────────────────────────

  async getPortfolioHealth(
    portfolioId: string,
    organizationId: string,
  ): Promise<PortfolioHealthResult> {
    const startMs = Date.now();
    const portfolio = await this.portfolioRepo.findOne({
      where: { id: portfolioId, organizationId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const projects = await this.loadPortfolioProjects(portfolioId, organizationId);

    if (projects.length > 50) {
      this.logger.warn({
        context: 'PORTFOLIO_HEALTH',
        portfolioId,
        message: 'Large portfolio aggregation',
        projectCount: projects.length,
      });
    }

    // Load latest EV snapshot for each project
    const evMap = await this.loadLatestSnapshots(
      projects.map((p) => p.id),
      organizationId,
    );

    // Wave 8F: Load budgets from project_budgets table (source of truth)
    const budgetsMap = await this.loadProjectBudgets(projects.map((p) => p.id));

    let totalBudget = 0;
    let totalActualCost = 0;
    let weightedEV = 0;
    let weightedAC = 0;
    let weightedPV = 0;
    let totalBAC = 0;
    let criticalCount = 0;
    let atRiskCount = 0;

    let evEligibleCount = 0;

    const projectHealths: PortfolioProjectHealth[] = projects.map((p) => {
      // Wave 8F: Prefer project_budgets table, fallback to legacy project.budget
      const pb = budgetsMap.get(p.id);
      const budget = pb ? parseFloat(pb.baselineBudget || '0') : (Number(p.budget) || 0);
      const actual = Number(p.actualCost) || 0;
      totalBudget += budget;
      totalActualCost += actual;

      const ev = evMap.get(p.id);
      const cpi = ev ? Number(ev.cpi) : null;
      const spi = ev ? Number(ev.spi) : null;

      // ─── EV rollup eligibility ─────────────────────────────────────
      // A project participates in portfolio-level CPI/SPI weighting
      // ONLY if it has an EV snapshot with BAC > 0. This means:
      //
      //   - Projects with earnedValueEnabled=false → excluded (no snapshot)
      //   - Projects with costTrackingEnabled=false → excluded (no snapshot)
      //   - Projects with BAC=0 (budget null/zero) → excluded (bac guard)
      //
      // These projects still appear in projectCount and the projects array
      // so executives see them in the breakdown — they are just not eligible
      // for the weighted CPI/SPI calculation. This prevents zero-budget
      // projects from diluting or distorting portfolio financial metrics.
      // ────────────────────────────────────────────────────────────────
      const bac = ev ? Number(ev.bac) || 0 : 0;
      const isEvEligible = ev !== undefined && bac > 0;

      if (isEvEligible) {
        evEligibleCount++;
        totalBAC += bac;
        weightedEV += Number(ev!.ev) || 0;
        weightedAC += Number(ev!.ac) || 0;
        weightedPV += Number(ev!.pv) || 0;
      }

      const riskReasons: string[] = [];
      if (cpi !== null && cpi < RISK_THRESHOLDS.CPI) {
        riskReasons.push(`CPI ${cpi.toFixed(2)} < ${RISK_THRESHOLDS.CPI}`);
      }
      if (spi !== null && spi < RISK_THRESHOLDS.SPI) {
        riskReasons.push(`SPI ${spi.toFixed(2)} < ${RISK_THRESHOLDS.SPI}`);
      }

      const isAtRisk = riskReasons.length > 0;
      if (isAtRisk) atRiskCount++;

      // Critical = has critical path slip (checked in getPortfolioCriticalPathRisk)
      // For health, we mark based on EV thresholds only
      if (cpi !== null && cpi < 0.7) criticalCount++;
      else if (spi !== null && spi < 0.7) criticalCount++;

      return {
        projectId: p.id,
        projectName: p.name,
        budget,
        actualCost: actual,
        cpi,
        spi,
        isAtRisk,
        riskReasons,
        evEligible: isEvEligible,
      };
    });

    const aggregateCPI = weightedAC > 0 ? weightedEV / weightedAC : null;
    const aggregateSPI = weightedPV > 0 ? weightedEV / weightedPV : null;

    const elapsedMs = Date.now() - startMs;
    this.logger.log({
      context: 'PORTFOLIO_HEALTH',
      portfolioId,
      projectCount: projects.length,
      evEligibleCount,
      atRiskCount,
      elapsedMs,
    });

    return {
      portfolioId,
      portfolioName: portfolio.name,
      projectCount: projects.length,
      evEligibleCount,
      totalBudget,
      totalActualCost,
      aggregateCPI,
      aggregateSPI,
      averageScheduleVarianceMinutes: 0, // populated by baseline drift
      criticalProjectsCount: criticalCount,
      atRiskProjectsCount: atRiskCount,
      projects: projectHealths,
    };
  }

  // ── 2. getPortfolioCriticalPathRisk ────────────────────────────────

  async getPortfolioCriticalPathRisk(
    portfolioId: string,
    organizationId: string,
  ): Promise<PortfolioCriticalPathRiskResult> {
    const portfolio = await this.portfolioRepo.findOne({
      where: { id: portfolioId, organizationId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const projects = await this.loadPortfolioProjects(portfolioId, organizationId);

    // For each project with an active baseline, compute compare to find slip
    const results: PortfolioCriticalPathRiskResult['projects'] = [];

    for (const p of projects) {
      const activeBaseline = await this.baselineRepo.findOne({
        where: { projectId: p.id, isActive: true },
      });
      if (!activeBaseline) continue;

      try {
        const compare = await this.baselineService.compareBaseline(activeBaseline.id);
        if (compare.projectSummary.criticalPathSlipMinutes > 0) {
          results.push({
            projectId: p.id,
            projectName: p.name,
            criticalPathSlipMinutes: compare.projectSummary.criticalPathSlipMinutes,
            maxTaskSlipMinutes: compare.projectSummary.maxSlipMinutes,
            countLate: compare.projectSummary.countLate,
          });
        }
      } catch {
        // Skip projects where compare fails
      }
    }

    // Sort by slip desc
    results.sort((a, b) => b.criticalPathSlipMinutes - a.criticalPathSlipMinutes);

    return {
      portfolioId,
      totalProjects: projects.length,
      projectsWithSlip: results.length,
      projects: results,
    };
  }

  // ── 3. getPortfolioBaselineDrift ───────────────────────────────────

  async getPortfolioBaselineDrift(
    portfolioId: string,
    organizationId: string,
  ): Promise<PortfolioBaselineDriftResult> {
    const portfolio = await this.portfolioRepo.findOne({
      where: { id: portfolioId, organizationId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const projects = await this.loadPortfolioProjects(portfolioId, organizationId);

    const results: PortfolioBaselineDriftResult['projects'] = [];
    let totalVariance = 0;
    let varianceCount = 0;

    for (const p of projects) {
      const activeBaseline = await this.baselineRepo.findOne({
        where: { projectId: p.id, isActive: true },
      });
      if (!activeBaseline) continue;

      try {
        const compare = await this.baselineService.compareBaseline(activeBaseline.id);
        // Average end variance across items
        const itemVariances = compare.items.map((i) => i.endVarianceMinutes);
        const avgVar = itemVariances.length > 0
          ? itemVariances.reduce((a, b) => a + b, 0) / itemVariances.length
          : 0;

        totalVariance += avgVar;
        varianceCount++;

        results.push({
          projectId: p.id,
          projectName: p.name,
          baselineId: compare.baselineId,
          baselineName: compare.baselineName,
          countLate: compare.projectSummary.countLate,
          maxSlipMinutes: compare.projectSummary.maxSlipMinutes,
          criticalPathSlipMinutes: compare.projectSummary.criticalPathSlipMinutes,
        });
      } catch {
        // Skip
      }
    }

    return {
      portfolioId,
      totalProjects: projects.length,
      projectsWithBaseline: results.length,
      averageEndVarianceMinutes: varianceCount > 0 ? totalVariance / varianceCount : 0,
      projects: results,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private async loadPortfolioProjects(
    portfolioId: string,
    organizationId: string,
  ): Promise<Project[]> {
    const pps = await this.ppRepo.find({
      where: { portfolioId, organizationId },
    });
    const projectIds = pps.map((pp) => pp.projectId);
    if (projectIds.length === 0) return [];

    return this.projectRepo.find({
      where: { id: In(projectIds), organizationId },
    });
  }

  /**
   * Wave 8F: Load budgets from project_budgets table.
   * Returns map of projectId -> budget entity.
   */
  private async loadProjectBudgets(
    projectIds: string[],
  ): Promise<Map<string, ProjectBudgetEntity>> {
    if (projectIds.length === 0) return new Map();
    const budgets = await this.budgetRepo.find({
      where: { projectId: In(projectIds) },
    });
    const map = new Map<string, ProjectBudgetEntity>();
    for (const b of budgets) {
      map.set(b.projectId, b);
    }
    return map;
  }

  private async loadLatestSnapshots(
    projectIds: string[],
    organizationId: string,
  ): Promise<Map<string, EarnedValueSnapshot>> {
    if (projectIds.length === 0) return new Map();

    // For each project, get the latest snapshot
    const map = new Map<string, EarnedValueSnapshot>();
    for (const pid of projectIds) {
      const snapshot = await this.evSnapshotRepo.findOne({
        where: { projectId: pid },
        order: { asOfDate: 'DESC' },
      });
      if (snapshot) map.set(pid, snapshot);
    }
    return map;
  }
}
