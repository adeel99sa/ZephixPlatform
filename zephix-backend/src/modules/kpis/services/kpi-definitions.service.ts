import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KpiDefinitionEntity } from '../entities/kpi-definition.entity';
import { KPI_REGISTRY_DEFAULTS } from '../engine/kpi-registry-defaults';

@Injectable()
export class KpiDefinitionsService {
  private readonly logger = new Logger(KpiDefinitionsService.name);
  private defaultsSeeded = false;

  constructor(
    @InjectRepository(KpiDefinitionEntity)
    private readonly repo: Repository<KpiDefinitionEntity>,
  ) {}

  /**
   * Ensure the 12 MVP defaults exist in the kpi_definitions table.
   * Uses INSERT ... ON CONFLICT (kpi_key) DO UPDATE for idempotency.
   */
  async ensureDefaults(): Promise<void> {
    if (this.defaultsSeeded) return;

    for (const def of KPI_REGISTRY_DEFAULTS) {
      await this.repo.query(
        `INSERT INTO kpi_definitions (
           kpi_key, name, description, category, unit, direction,
           lifecycle_phase, formula_type, data_sources,
           required_governance_flag, is_leading, is_lagging,
           default_enabled, calculation_strategy, is_active
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true)
         ON CONFLICT (kpi_key) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           category = EXCLUDED.category,
           unit = EXCLUDED.unit,
           direction = EXCLUDED.direction,
           lifecycle_phase = EXCLUDED.lifecycle_phase,
           formula_type = EXCLUDED.formula_type,
           data_sources = EXCLUDED.data_sources,
           required_governance_flag = EXCLUDED.required_governance_flag,
           is_leading = EXCLUDED.is_leading,
           is_lagging = EXCLUDED.is_lagging,
           default_enabled = EXCLUDED.default_enabled,
           calculation_strategy = EXCLUDED.calculation_strategy,
           updated_at = now()`,
        [
          def.code,
          def.name,
          def.description,
          def.category,
          def.unit,
          def.direction,
          def.lifecyclePhase,
          def.formulaType,
          JSON.stringify(def.dataSources),
          def.requiredGovernanceFlag,
          def.isLeading,
          def.isLagging,
          def.defaultEnabled,
          def.calculationStrategy,
        ],
      );
    }

    this.defaultsSeeded = true;
    this.logger.log(`KPI registry defaults ensured (${KPI_REGISTRY_DEFAULTS.length} definitions)`);
  }

  /**
   * List KPI definitions scoped by organization.
   * Returns: is_system=true (global) OR organization_id=currentOrg (org-custom).
   * Never returns another org's custom definitions.
   */
  async listDefinitions(
    includeDisabledByGovernance = true,
    organizationId?: string,
  ): Promise<KpiDefinitionEntity[]> {
    await this.ensureDefaults();

    const qb = this.repo
      .createQueryBuilder('d')
      .where('d.isActive = true')
      .andWhere(
        '(d.is_system = true OR d.organization_id IS NULL' +
          (organizationId ? ' OR d.organization_id = :orgId' : '') +
          ')',
        organizationId ? { orgId: organizationId } : {},
      );

    if (!includeDisabledByGovernance) {
      qb.andWhere(
        '(d.required_governance_flag IS NULL OR d.required_governance_flag = :empty)',
        { empty: '' },
      );
    }

    return qb.orderBy('d.category', 'ASC').addOrderBy('d.code', 'ASC').getMany();
  }

  async findById(id: string): Promise<KpiDefinitionEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<KpiDefinitionEntity | null> {
    return this.repo.findOne({ where: { code } });
  }

  async findByCodes(codes: string[]): Promise<KpiDefinitionEntity[]> {
    if (codes.length === 0) return [];
    return this.repo
      .createQueryBuilder('d')
      .where('d.code IN (:...codes)', { codes })
      .getMany();
  }
}
