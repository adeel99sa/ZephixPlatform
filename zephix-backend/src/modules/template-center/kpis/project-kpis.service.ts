import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { ProjectKpi } from './entities/project-kpi.entity';
import { KpiValue } from './entities/kpi-value.entity';
import { KpiDefinition } from './entities/kpi-definition.entity';
import type { ProjectKpiDto } from './dto/kpi-values.dto';

@Injectable()
export class ProjectKpisService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectKpi)
    private readonly projectKpiRepo: Repository<ProjectKpi>,
    @InjectRepository(KpiValue)
    private readonly kpiValueRepo: Repository<KpiValue>,
    @InjectRepository(KpiDefinition)
    private readonly kpiDefRepo: Repository<KpiDefinition>,
  ) {}

  private async assertProjectAccess(
    projectId: string,
    organizationId: string,
    workspaceId?: string | null,
  ): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'organizationId', 'workspaceId'],
    });
    if (!project) throw new NotFoundException('Project not found');
    // Cross-org access must return 403, not 404
    if (project.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Project does not belong to your organization',
      );
    }
    if (workspaceId != null && project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Project does not belong to this workspace');
    }
    return project;
  }

  async list(
    projectId: string,
    organizationId: string,
    workspaceId?: string | null,
  ): Promise<ProjectKpiDto[]> {
    await this.assertProjectAccess(projectId, organizationId, workspaceId);
    const projectKpis = await this.projectKpiRepo.find({
      where: { projectId },
      relations: ['kpiDefinition'],
      order: { createdAt: 'ASC' },
    });
    const dtos: ProjectKpiDto[] = [];
    for (const pk of projectKpis) {
      const latest = await this.kpiValueRepo.findOne({
        where: { projectKpiId: pk.id },
        order: { recordedAt: 'DESC' },
      });
      dtos.push({
        id: pk.id,
        projectId: pk.projectId,
        kpiKey: pk.kpiDefinition?.kpiKey ?? '',
        name: pk.kpiDefinition?.name ?? '',
        category: pk.kpiDefinition?.category ?? '',
        unit: pk.kpiDefinition?.unit ?? null,
        target: pk.kpiDefinition?.thresholds ?? null,
        latestValue: latest?.value != null ? Number(latest.value) : null,
        latestAsOfDate: latest?.recordedAt?.toISOString() ?? null,
      });
    }
    return dtos;
  }

  async recordValue(
    projectId: string,
    kpiKey: string,
    value: number,
    asOfDate?: string,
    note?: string,
    organizationId?: string,
    workspaceId?: string | null,
  ): Promise<ProjectKpiDto> {
    if (organizationId != null) {
      await this.assertProjectAccess(projectId, organizationId, workspaceId);
    }
    if (!Number.isFinite(value)) {
      throw new BadRequestException('value must be a finite number');
    }
    const def = await this.kpiDefRepo.findOne({ where: { kpiKey } });
    if (!def)
      throw new NotFoundException(`KPI definition "${kpiKey}" not found`);
    const projectKpi = await this.projectKpiRepo.findOne({
      where: { projectId, kpiDefinitionId: def.id },
      relations: ['kpiDefinition'],
    });
    if (!projectKpi) {
      throw new NotFoundException(
        `KPI "${kpiKey}" is not attached to this project`,
      );
    }
    const recordedAt = asOfDate ? new Date(asOfDate) : new Date();
    const row = this.kpiValueRepo.create({
      projectKpiId: projectKpi.id,
      value,
      recordedAt,
      valueText: note ?? null,
      metadata: note ? { note } : null,
    });
    await this.kpiValueRepo.save(row);
    const latest = await this.kpiValueRepo.findOne({
      where: { projectKpiId: projectKpi.id },
      order: { recordedAt: 'DESC' },
    });
    return {
      id: projectKpi.id,
      projectId: projectKpi.projectId,
      kpiKey: projectKpi.kpiDefinition?.kpiKey ?? kpiKey,
      name: projectKpi.kpiDefinition?.name ?? '',
      category: projectKpi.kpiDefinition?.category ?? '',
      unit: projectKpi.kpiDefinition?.unit ?? null,
      target: projectKpi.kpiDefinition?.thresholds ?? null,
      latestValue: latest?.value != null ? Number(latest.value) : null,
      latestAsOfDate: latest?.recordedAt?.toISOString() ?? null,
    };
  }
}
