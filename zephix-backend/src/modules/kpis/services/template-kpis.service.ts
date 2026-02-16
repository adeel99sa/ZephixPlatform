import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateKpiEntity } from '../entities/template-kpi.entity';
import { KpiDefinitionEntity } from '../entities/kpi-definition.entity';
import { ProjectKpiConfigEntity } from '../entities/project-kpi-config.entity';
import { KpiDefinitionsService } from './kpi-definitions.service';
import { findKpiPack, KPI_PACKS } from '../engine/kpi-packs';

export interface AssignKpiInput {
  kpiDefinitionId: string;
  isRequired?: boolean;
  defaultTarget?: string | null;
}

@Injectable()
export class TemplateKpisService {
  private readonly logger = new Logger(TemplateKpisService.name);

  constructor(
    @InjectRepository(TemplateKpiEntity)
    private readonly repo: Repository<TemplateKpiEntity>,
    @InjectRepository(ProjectKpiConfigEntity)
    private readonly configRepo: Repository<ProjectKpiConfigEntity>,
    @InjectRepository(KpiDefinitionEntity)
    private readonly defRepo: Repository<KpiDefinitionEntity>,
    private readonly definitionsService: KpiDefinitionsService,
  ) {}

  /**
   * Assign a KPI to a template.
   * Does not duplicate kpi_definitions — references existing definition by ID.
   */
  async assignKpiToTemplate(
    templateId: string,
    input: AssignKpiInput,
  ): Promise<TemplateKpiEntity> {
    const def = await this.defRepo.findOne({
      where: { id: input.kpiDefinitionId },
    });
    if (!def) {
      throw new NotFoundException(
        `KPI definition not found: ${input.kpiDefinitionId}`,
      );
    }

    const existing = await this.repo.findOne({
      where: { templateId, kpiDefinitionId: input.kpiDefinitionId },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'TEMPLATE_KPI_DUPLICATE',
        message: `KPI "${def.code}" is already assigned to this template`,
      });
    }

    const entity = this.repo.create({
      templateId,
      kpiDefinitionId: input.kpiDefinitionId,
      isRequired: input.isRequired ?? false,
      defaultTarget: input.defaultTarget ?? null,
    });

    return this.repo.save(entity);
  }

  /**
   * List all KPIs assigned to a template.
   */
  async listTemplateKpis(templateId: string): Promise<TemplateKpiEntity[]> {
    return this.repo.find({
      where: { templateId },
      relations: ['kpiDefinition'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Remove a KPI from a template.
   */
  async removeTemplateKpi(
    templateId: string,
    kpiDefinitionId: string,
  ): Promise<void> {
    const existing = await this.repo.findOne({
      where: { templateId, kpiDefinitionId },
    });
    if (!existing) {
      throw new NotFoundException(
        `KPI binding not found for template ${templateId} and definition ${kpiDefinitionId}`,
      );
    }
    await this.repo.remove(existing);
  }

  /**
   * Auto-activate template KPIs for a newly created project.
   *
   * Called during project instantiation from a template.
   * Creates project_kpi_configs from template_kpis bindings.
   * Skips any configs that already exist (idempotent).
   * Does NOT duplicate kpi_definitions.
   */
  async autoActivateForProject(
    templateId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectKpiConfigEntity[]> {
    await this.definitionsService.ensureDefaults();

    const templateKpis = await this.repo.find({
      where: { templateId },
      relations: ['kpiDefinition'],
    });

    if (templateKpis.length === 0) {
      return [];
    }

    const results: ProjectKpiConfigEntity[] = [];

    for (const tk of templateKpis) {
      const existingConfig = await this.configRepo.findOne({
        where: {
          workspaceId,
          projectId,
          kpiDefinitionId: tk.kpiDefinitionId,
        },
      });

      if (existingConfig) {
        // Already exists — skip, do not duplicate
        results.push(existingConfig);
        continue;
      }

      const targetJson = tk.defaultTarget
        ? { value: parseFloat(tk.defaultTarget) }
        : null;

      const config = this.configRepo.create({
        workspaceId,
        projectId,
        kpiDefinitionId: tk.kpiDefinitionId,
        enabled: true,
        target: targetJson,
      });

      const saved = await this.configRepo.save(config);
      results.push(saved);
    }

    this.logger.log(
      `Auto-activated ${results.length} KPIs for project ${projectId} from template ${templateId}`,
    );

    return results;
  }

  /**
   * Wave 4D: Apply a curated KPI pack to a template.
   * Idempotent — skips codes already assigned. Does not duplicate rows.
   */
  async applyPack(
    templateId: string,
    packCode: string,
  ): Promise<TemplateKpiEntity[]> {
    const pack = findKpiPack(packCode);
    if (!pack) {
      throw new BadRequestException({
        code: 'UNKNOWN_KPI_PACK',
        message: `KPI pack not found: ${packCode}`,
      });
    }

    await this.definitionsService.ensureDefaults();

    const codes = pack.bindings.map((b) => b.kpiCode);
    const defs = await this.definitionsService.findByCodes(codes);
    const defMap = new Map(defs.map((d) => [d.code, d]));

    const existing = await this.repo.find({
      where: { templateId },
      relations: ['kpiDefinition'],
    });
    const existingDefIds = new Set(existing.map((e) => e.kpiDefinitionId));

    const created: TemplateKpiEntity[] = [];

    for (const binding of pack.bindings) {
      const def = defMap.get(binding.kpiCode);
      if (!def) {
        this.logger.warn(
          `Pack "${packCode}" references unknown KPI code "${binding.kpiCode}" — skipping`,
        );
        continue;
      }

      if (existingDefIds.has(def.id)) {
        continue;
      }

      const entity = this.repo.create({
        templateId,
        kpiDefinitionId: def.id,
        isRequired: binding.isRequired,
        defaultTarget: binding.defaultTarget ?? null,
      });
      const saved = await this.repo.save(entity);
      created.push(saved);
    }

    this.logger.log(
      `Applied pack "${packCode}" to template ${templateId}: ${created.length} new bindings, ${pack.bindings.length - created.length} already existed`,
    );

    return this.listTemplateKpis(templateId);
  }

  /**
   * Wave 6: Copy all KPI bindings from one template to another.
   * Used during template cloning. Idempotent — skips duplicates.
   */
  async copyBindings(
    sourceTemplateId: string,
    targetTemplateId: string,
  ): Promise<number> {
    const sourceBindings = await this.repo.find({
      where: { templateId: sourceTemplateId },
    });

    let copied = 0;
    for (const binding of sourceBindings) {
      const exists = await this.repo.findOne({
        where: {
          templateId: targetTemplateId,
          kpiDefinitionId: binding.kpiDefinitionId,
        },
      });
      if (exists) continue;

      await this.repo.save(
        this.repo.create({
          templateId: targetTemplateId,
          kpiDefinitionId: binding.kpiDefinitionId,
          isRequired: binding.isRequired,
          defaultTarget: binding.defaultTarget,
        }),
      );
      copied++;
    }

    return copied;
  }

  /**
   * List available KPI packs metadata.
   */
  listPacks() {
    return KPI_PACKS.map((p) => ({
      packCode: p.packCode,
      name: p.name,
      description: p.description,
      kpiCount: p.bindings.length,
    }));
  }
}
