import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectKpiConfigEntity } from '../entities/project-kpi-config.entity';
import { KpiDefinitionEntity } from '../entities/kpi-definition.entity';
import { KpiDefinitionsService } from './kpi-definitions.service';

export interface UpsertConfigInput {
  kpiCode: string;
  enabled?: boolean;
  thresholdWarning?: Record<string, any> | null;
  thresholdCritical?: Record<string, any> | null;
  target?: Record<string, any> | null;
}

@Injectable()
export class ProjectKpiConfigsService {
  private readonly logger = new Logger(ProjectKpiConfigsService.name);

  constructor(
    @InjectRepository(ProjectKpiConfigEntity)
    private readonly repo: Repository<ProjectKpiConfigEntity>,
    private readonly definitionsService: KpiDefinitionsService,
  ) {}

  /**
   * Get all configs for a project, auto-creating rows for default_enabled definitions.
   */
  async getConfigs(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectKpiConfigEntity[]> {
    await this.definitionsService.ensureDefaults();

    const existing = await this.repo.find({
      where: { workspaceId, projectId },
      relations: ['kpiDefinition'],
    });

    const existingDefIds = new Set(existing.map((c) => c.kpiDefinitionId));

    const allDefs = await this.definitionsService.listDefinitions();
    const toCreate = allDefs.filter(
      (d) => d.defaultEnabled && !existingDefIds.has(d.id),
    );

    if (toCreate.length > 0) {
      const newConfigs = toCreate.map((d) =>
        this.repo.create({
          workspaceId,
          projectId,
          kpiDefinitionId: d.id,
          enabled: true,
        }),
      );
      await this.repo.save(newConfigs);
      return this.repo.find({
        where: { workspaceId, projectId },
        relations: ['kpiDefinition'],
      });
    }

    return existing;
  }

  /**
   * Upsert configs. Enforces governance flag validation.
   */
  async upsertConfigs(
    workspaceId: string,
    projectId: string,
    inputs: UpsertConfigInput[],
    projectFlags: Record<string, boolean>,
  ): Promise<ProjectKpiConfigEntity[]> {
    await this.definitionsService.ensureDefaults();

    const codes = inputs.map((i) => i.kpiCode);
    const definitions = await this.definitionsService.findByCodes(codes);
    const defMap = new Map(definitions.map((d) => [d.code, d]));

    const results: ProjectKpiConfigEntity[] = [];

    for (const input of inputs) {
      const def = defMap.get(input.kpiCode);
      if (!def) {
        throw new BadRequestException(
          `KPI definition not found: ${input.kpiCode}`,
        );
      }

      if (
        input.enabled &&
        def.requiredGovernanceFlag &&
        !projectFlags[def.requiredGovernanceFlag]
      ) {
        throw new BadRequestException({
          code: 'KPI_GOVERNANCE_DISABLED',
          message: `Cannot enable KPI "${input.kpiCode}": governance flag "${def.requiredGovernanceFlag}" is not enabled on this project`,
        });
      }

      let config = await this.repo.findOne({
        where: { workspaceId, projectId, kpiDefinitionId: def.id },
      });

      if (config) {
        if (input.enabled !== undefined) config.enabled = input.enabled;
        if (input.thresholdWarning !== undefined)
          config.thresholdWarning = input.thresholdWarning;
        if (input.thresholdCritical !== undefined)
          config.thresholdCritical = input.thresholdCritical;
        if (input.target !== undefined) config.target = input.target;
        config = await this.repo.save(config);
      } else {
        config = await this.repo.save(
          this.repo.create({
            workspaceId,
            projectId,
            kpiDefinitionId: def.id,
            enabled: input.enabled ?? false,
            thresholdWarning: input.thresholdWarning ?? null,
            thresholdCritical: input.thresholdCritical ?? null,
            target: input.target ?? null,
          }),
        );
      }

      results.push(config);
    }

    return results;
  }

  /**
   * Upsert a single config by kpiDefinitionId.
   */
  async upsertSingleConfig(
    workspaceId: string,
    projectId: string,
    kpiDefinitionId: string,
    input: { enabled?: boolean; targetValue?: string; thresholdsJson?: Record<string, any> },
    projectFlags: Record<string, boolean>,
    organizationId?: string,
  ): Promise<ProjectKpiConfigEntity> {
    await this.definitionsService.ensureDefaults();

    const def = await this.definitionsService.findById(kpiDefinitionId);
    if (!def) {
      throw new BadRequestException(`KPI definition not found: ${kpiDefinitionId}`);
    }

    // Org-scope guard: definition must be system-level OR belong to caller's org
    if (!def.isSystem && def.organizationId && organizationId && def.organizationId !== organizationId) {
      throw new BadRequestException(`KPI definition not accessible: ${kpiDefinitionId}`);
    }

    if (
      input.enabled &&
      def.requiredGovernanceFlag &&
      !projectFlags[def.requiredGovernanceFlag]
    ) {
      throw new BadRequestException({
        code: 'KPI_GOVERNANCE_DISABLED',
        message: `Cannot enable KPI "${def.code}": governance flag "${def.requiredGovernanceFlag}" is not enabled on this project`,
      });
    }

    let config = await this.repo.findOne({
      where: { workspaceId, projectId, kpiDefinitionId },
      relations: ['kpiDefinition'],
    });

    if (config) {
      if (input.enabled !== undefined) config.enabled = input.enabled;
      if (input.targetValue !== undefined) {
        config.target = input.targetValue ? { value: input.targetValue } : null;
      }
      if (input.thresholdsJson !== undefined) {
        config.thresholdWarning = input.thresholdsJson;
      }
      config = await this.repo.save(config);
    } else {
      config = await this.repo.save(
        this.repo.create({
          workspaceId,
          projectId,
          kpiDefinitionId,
          enabled: input.enabled ?? false,
          target: input.targetValue ? { value: input.targetValue } : null,
          thresholdWarning: input.thresholdsJson ?? null,
        }),
      );
    }

    return this.repo.findOne({
      where: { id: config.id },
      relations: ['kpiDefinition'],
    }) as Promise<ProjectKpiConfigEntity>;
  }

  /**
   * Get only enabled configs for a project.
   */
  async getEnabledConfigs(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectKpiConfigEntity[]> {
    return this.repo.find({
      where: { workspaceId, projectId, enabled: true },
      relations: ['kpiDefinition'],
    });
  }
}
