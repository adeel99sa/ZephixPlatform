import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ProjectKpiValueEntity } from '../entities/project-kpi-value.entity';
import { KpiComputeResult } from '../engine/kpi-calculators';

@Injectable()
export class ProjectKpiValuesService {
  constructor(
    @InjectRepository(ProjectKpiValueEntity)
    private readonly repo: Repository<ProjectKpiValueEntity>,
  ) {}

  /**
   * Upsert a computed KPI value for today.
   */
  async upsertValue(
    workspaceId: string,
    projectId: string,
    kpiDefinitionId: string,
    asOfDate: string,
    result: KpiComputeResult,
  ): Promise<ProjectKpiValueEntity> {
    let existing = await this.repo.findOne({
      where: { workspaceId, projectId, kpiDefinitionId, asOfDate },
    });

    if (existing) {
      existing.valueNumeric =
        result.valueNumeric != null ? String(result.valueNumeric) : null;
      existing.valueText = result.valueText;
      existing.valueJson = result.valueJson;
      existing.sampleSize = result.sampleSize;
      existing.computedAt = new Date();
      return this.repo.save(existing);
    }

    return this.repo.save(
      this.repo.create({
        workspaceId,
        projectId,
        kpiDefinitionId,
        asOfDate,
        valueNumeric:
          result.valueNumeric != null ? String(result.valueNumeric) : null,
        valueText: result.valueText,
        valueJson: result.valueJson,
        sampleSize: result.sampleSize,
        computedAt: new Date(),
      }),
    );
  }

  /**
   * Query KPI values by date range.
   */
  async getValues(
    workspaceId: string,
    projectId: string,
    from: string,
    to: string,
  ): Promise<ProjectKpiValueEntity[]> {
    return this.repo.find({
      where: {
        workspaceId,
        projectId,
        asOfDate: Between(from, to),
      },
      relations: ['kpiDefinition'],
      order: { asOfDate: 'DESC' },
    });
  }

  /**
   * Get today's values for a project.
   */
  async getTodayValues(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectKpiValueEntity[]> {
    const today = new Date().toISOString().slice(0, 10);
    return this.repo.find({
      where: { workspaceId, projectId, asOfDate: today },
      relations: ['kpiDefinition'],
    });
  }
}
