import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkTask } from '../entities/work-task.entity';
import { Project } from '../../projects/entities/project.entity';

export interface ProjectCostSummary {
  projectId: string;
  budgetAmount: number | null;
  currency: string;
  rate: number;
  costTrackingEnabled: boolean;
  plannedHours: number;
  actualHours: number;
  remainingHours: number;
  plannedCost: number;
  actualCost: number;
  costVariance: number;
  forecastAtCompletion: number;
}

export interface WorkspaceCostRollup {
  projectId: string;
  projectName: string;
  budgetAmount: number | null;
  plannedCost: number;
  actualCost: number;
  variance: number;
}

@Injectable()
export class ProjectCostService {
  constructor(
    @InjectRepository(WorkTask)
    private workTaskRepo: Repository<WorkTask>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
  ) {}

  async getProjectCostSummary(
    organizationId: string,
    projectId: string,
  ): Promise<ProjectCostSummary> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    // C4 Fix: Return zeroed summary when cost tracking is disabled
    if (!project.costTrackingEnabled) {
      return {
        projectId,
        budgetAmount: project.budget ? Number(project.budget) : null,
        currency: project.currency || 'USD',
        rate: 0,
        costTrackingEnabled: false,
        plannedHours: 0,
        actualHours: 0,
        remainingHours: 0,
        plannedCost: 0,
        actualCost: 0,
        costVariance: 0,
        forecastAtCompletion: 0,
      };
    }

    const rate = project.flatLaborRatePerHour
      ? Number(project.flatLaborRatePerHour)
      : 0;

    const agg = await this.workTaskRepo
      .createQueryBuilder('t')
      .select([
        'COALESCE(SUM(t.estimate_hours), 0)::numeric AS "plannedHours"',
        'COALESCE(SUM(t.actual_hours), 0)::numeric AS "actualHours"',
        'COALESCE(SUM(t.remaining_hours), 0)::numeric AS "remainingHours"',
      ])
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.organization_id = :organizationId', { organizationId })
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();

    const plannedHours = Number(agg.plannedHours);
    const actualHours = Number(agg.actualHours);
    const remainingHours = Number(agg.remainingHours);

    const plannedCost = plannedHours * rate;
    const actualCost = actualHours * rate;
    const costVariance = plannedCost - actualCost;
    const forecastAtCompletion = actualCost + remainingHours * rate;

    return {
      projectId,
      budgetAmount: project.budget ? Number(project.budget) : null,
      currency: project.currency || 'USD',
      rate,
      costTrackingEnabled: true,
      plannedHours,
      actualHours,
      remainingHours,
      plannedCost,
      actualCost,
      costVariance,
      forecastAtCompletion,
    };
  }

  async getWorkspaceCostRollup(
    organizationId: string,
    workspaceId: string,
  ): Promise<WorkspaceCostRollup[]> {
    const rows = await this.projectRepo
      .createQueryBuilder('p')
      .leftJoin(WorkTask, 't', 't.project_id = p.id AND t.deleted_at IS NULL')
      .select([
        'p.id AS "projectId"',
        'p.name AS "projectName"',
        'p.budget AS "budgetAmount"',
        'COALESCE(SUM(t.estimate_hours), 0)::numeric * COALESCE(p.flat_labor_rate_per_hour, 0) AS "plannedCost"',
        'COALESCE(SUM(t.actual_hours), 0)::numeric * COALESCE(p.flat_labor_rate_per_hour, 0) AS "actualCost"',
      ])
      .where('p.organization_id = :organizationId', { organizationId })
      .andWhere('p.workspace_id = :workspaceId', { workspaceId })
      .andWhere('p.cost_tracking_enabled = true')
      .groupBy('p.id')
      .orderBy('"actualCost"', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      projectId: r.projectId,
      projectName: r.projectName,
      budgetAmount: r.budgetAmount ? Number(r.budgetAmount) : null,
      plannedCost: Number(r.plannedCost),
      actualCost: Number(r.actualCost),
      variance: Number(r.plannedCost) - Number(r.actualCost),
    }));
  }
}
