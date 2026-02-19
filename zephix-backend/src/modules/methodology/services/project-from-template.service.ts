import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { MethodologyConfigResolverService } from './methodology-config-resolver.service';
import { MethodologyConfigValidatorService } from './methodology-config-validator.service';
import { MethodologyConfig, MethodologyCode } from '../interfaces/methodology-config.interface';
import { KPI_PACKS } from '../constants/kpi-packs';

interface CreateProjectFromTemplatePayload {
  templateId: string;
  name: string;
  workspaceId: string;
  organizationId: string;
  userId: string;
  startDate?: Date;
  description?: string;
  /** Optional overrides applied on top of template-derived methodology config */
  methodologyOverrides?: Partial<MethodologyConfig>;
}

interface CreateProjectResult {
  projectId: string;
  projectName: string;
  methodology: string;
  phaseCount: number;
  taskCount: number;
  kpiCount: number;
  wipConfigCreated: boolean;
  gateCount: number;
}

/**
 * M2: Unified "create project from template" path.
 *
 * Single transaction creates: Project (with methodology_config) → WorkPhases →
 * WorkTasks → PhaseGateDefinitions → ProjectWorkflowConfig → ProjectKpiConfigs → DoD.
 *
 * Replaces both `TemplatesService.applyTemplateUnified` (legacy Tasks)
 * and `TemplatesInstantiateV51Service.instantiateV51` (no governance flags).
 */
@Injectable()
export class ProjectFromTemplateService {
  private readonly logger = new Logger(ProjectFromTemplateService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configResolver: MethodologyConfigResolverService,
    private readonly configValidator: MethodologyConfigValidatorService,
  ) {}

  async create(payload: CreateProjectFromTemplatePayload): Promise<CreateProjectResult> {
    return this.dataSource.transaction(async (manager) => {
      // ── 1. Load and validate template ──
      const template = await this.loadTemplate(
        manager,
        payload.templateId,
        payload.organizationId,
      );

      // ── 2. Validate workspace belongs to org ──
      await this.validateWorkspace(
        manager,
        payload.workspaceId,
        payload.organizationId,
      );

      // ── 3. Resolve methodology config ──
      const methodologyCode = (template.methodology || 'agile') as MethodologyCode;
      const methodologyConfig = this.configResolver.resolve(
        methodologyCode,
        payload.methodologyOverrides,
      );
      this.configValidator.validateOrThrow(methodologyConfig);

      // ── 4. Create project ──
      const projectId = await this.createProject(
        manager,
        payload,
        template,
        methodologyConfig,
      );

      // ── 5. Create phases from template ──
      const phases = template.phases || [];
      const phaseIdMap = await this.createPhases(
        manager,
        projectId,
        payload,
        phases,
      );

      // ── 6. Create tasks within phases ──
      const taskTemplates = template.taskTemplates || [];
      const taskCount = await this.createTasks(
        manager,
        projectId,
        payload,
        taskTemplates,
        phaseIdMap,
      );

      // ── 7. Create phase gates if required ──
      let gateCount = 0;
      if (methodologyConfig.phases.gateRequired && phases.length > 0) {
        gateCount = await this.createPhaseGates(
          manager,
          projectId,
          payload,
          phaseIdMap,
        );
      }

      // ── 8. Create WIP config if enabled ──
      let wipConfigCreated = false;
      if (methodologyConfig.wip.enabled) {
        await this.createWorkflowConfig(
          manager,
          projectId,
          payload,
          methodologyConfig,
        );
        wipConfigCreated = true;
      }

      // ── 9. Create KPI configs from pack ──
      const kpiCount = await this.createKpiConfigs(
        manager,
        projectId,
        payload,
        methodologyConfig,
      );

      this.logger.log({
        action: 'PROJECT_FROM_TEMPLATE_CREATED',
        projectId,
        templateId: payload.templateId,
        methodology: methodologyCode,
        phaseCount: phases.length,
        taskCount,
        gateCount,
        kpiCount,
        wipConfigCreated,
      });

      return {
        projectId,
        projectName: payload.name,
        methodology: methodologyCode,
        phaseCount: phases.length,
        taskCount,
        kpiCount,
        wipConfigCreated,
        gateCount,
      };
    });
  }

  private async loadTemplate(
    manager: EntityManager,
    templateId: string,
    organizationId: string,
  ): Promise<any> {
    const template = await manager.query(
      `SELECT * FROM templates
       WHERE id = $1
         AND is_active = true
         AND (is_system = true OR organization_id = $2)
       LIMIT 1`,
      [templateId, organizationId],
    );

    if (!template || template.length === 0) {
      throw new NotFoundException(
        `Template ${templateId} not found or not active`,
      );
    }

    const tpl = template[0];

    if (!tpl.is_system && tpl.organization_id !== organizationId) {
      throw new ForbiddenException(
        'Template does not belong to your organization',
      );
    }

    // Normalize JSONB fields
    return {
      id: tpl.id,
      name: tpl.name,
      methodology: tpl.methodology,
      defaultGovernanceFlags: tpl.default_governance_flags || {},
      phases: tpl.phases || [],
      taskTemplates: tpl.task_templates || [],
      defaultEnabledKPIs: tpl.default_enabled_kpis || [],
      structure: tpl.structure,
    };
  }

  private async validateWorkspace(
    manager: EntityManager,
    workspaceId: string,
    organizationId: string,
  ): Promise<void> {
    const ws = await manager.query(
      `SELECT id FROM workspaces WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [workspaceId, organizationId],
    );
    if (!ws || ws.length === 0) {
      throw new NotFoundException(
        `Workspace ${workspaceId} not found in organization`,
      );
    }
  }

  private async createProject(
    manager: EntityManager,
    payload: CreateProjectFromTemplatePayload,
    template: any,
    config: MethodologyConfig,
  ): Promise<string> {
    const result = await manager.query(
      `INSERT INTO projects (
        name, description, workspace_id, organization_id, created_by_id,
        status, priority, risk_level, methodology,
        iterations_enabled, cost_tracking_enabled, baselines_enabled,
        earned_value_enabled, capacity_enabled, change_management_enabled,
        waterfall_enabled, template_id, governance_source,
        estimation_mode, default_iteration_length_days,
        methodology_config, start_date
      ) VALUES (
        $1, $2, $3, $4, $5,
        'planning', 'medium', 'medium', $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14, 'TEMPLATE',
        $15, $16,
        $17, $18
      ) RETURNING id`,
      [
        payload.name,
        payload.description || null,
        payload.workspaceId,
        payload.organizationId,
        payload.userId,
        config.methodologyCode,
        config.governance.iterationsEnabled,
        config.governance.costTrackingEnabled,
        config.governance.baselinesEnabled,
        config.governance.earnedValueEnabled,
        config.governance.capacityEnabled,
        config.governance.changeManagementEnabled,
        config.governance.waterfallEnabled,
        template.id,
        config.estimation.type === 'points'
          ? 'story_points'
          : config.estimation.type === 'both'
            ? 'both'
            : config.estimation.type,
        config.sprint.enabled ? config.sprint.defaultLengthDays : null,
        JSON.stringify(config),
        payload.startDate || null,
      ],
    );

    return result[0].id;
  }

  private async createPhases(
    manager: EntityManager,
    projectId: string,
    payload: CreateProjectFromTemplatePayload,
    phases: any[],
  ): Promise<Map<number, string>> {
    const phaseIdMap = new Map<number, string>();

    for (const phase of phases) {
      const result = await manager.query(
        `INSERT INTO work_phases (
          organization_id, workspace_id, project_id,
          name, sort_order, is_milestone, created_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, false, $6)
        RETURNING id`,
        [
          payload.organizationId,
          payload.workspaceId,
          projectId,
          phase.name,
          phase.order,
          payload.userId,
        ],
      );
      phaseIdMap.set(phase.order, result[0].id);
    }

    return phaseIdMap;
  }

  private async createTasks(
    manager: EntityManager,
    projectId: string,
    payload: CreateProjectFromTemplatePayload,
    taskTemplates: any[],
    phaseIdMap: Map<number, string>,
  ): Promise<number> {
    let count = 0;

    for (const tt of taskTemplates) {
      const phaseId = phaseIdMap.get(tt.phaseOrder) || null;

      await manager.query(
        `INSERT INTO work_tasks (
          organization_id, workspace_id, project_id, phase_id,
          title, description, status, priority, rank
        ) VALUES ($1, $2, $3, $4, $5, $6, 'todo', $7, $8)`,
        [
          payload.organizationId,
          payload.workspaceId,
          projectId,
          phaseId,
          tt.name,
          tt.description || null,
          tt.priority || 'medium',
          count + 1,
        ],
      );
      count++;
    }

    return count;
  }

  private async createPhaseGates(
    manager: EntityManager,
    projectId: string,
    payload: CreateProjectFromTemplatePayload,
    phaseIdMap: Map<number, string>,
  ): Promise<number> {
    let count = 0;
    // Create a gate for each phase except the last one
    const phaseEntries = Array.from(phaseIdMap.entries()).sort(
      ([a], [b]) => a - b,
    );

    for (let i = 0; i < phaseEntries.length - 1; i++) {
      const [order, phaseId] = phaseEntries[i];
      await manager.query(
        `INSERT INTO phase_gate_definitions (
          organization_id, workspace_id, project_id, phase_id,
          name, gate_key, status, created_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7)`,
        [
          payload.organizationId,
          payload.workspaceId,
          projectId,
          phaseId,
          `Gate: Phase ${order + 1} Review`,
          `gate_phase_${order}`,
          payload.userId,
        ],
      );
      count++;
    }

    return count;
  }

  private async createWorkflowConfig(
    manager: EntityManager,
    projectId: string,
    payload: CreateProjectFromTemplatePayload,
    config: MethodologyConfig,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO project_workflow_configs (
        organization_id, workspace_id, project_id,
        default_wip_limit, status_wip_limits
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (project_id) DO UPDATE SET
        default_wip_limit = EXCLUDED.default_wip_limit,
        status_wip_limits = EXCLUDED.status_wip_limits`,
      [
        payload.organizationId,
        payload.workspaceId,
        projectId,
        config.wip.defaultLimit,
        config.wip.perStatusLimits
          ? JSON.stringify(config.wip.perStatusLimits)
          : null,
      ],
    );
  }

  private async createKpiConfigs(
    manager: EntityManager,
    projectId: string,
    payload: CreateProjectFromTemplatePayload,
    config: MethodologyConfig,
  ): Promise<number> {
    const pack = KPI_PACKS[config.kpiPack.packCode];
    if (!pack) return 0;

    const allKpis = [...pack.requiredKpis, ...pack.optionalKpis];
    let count = 0;

    for (const kpiCode of allKpis) {
      // Look up KPI definition by kpi_key (mapped as 'code' in the entity)
      const def = await manager.query(
        `SELECT id FROM kpi_definitions WHERE kpi_key = $1 LIMIT 1`,
        [kpiCode],
      );

      if (!def || def.length === 0) continue;

      const kpiDefinitionId = def[0].id;
      const isRequired = pack.requiredKpis.includes(kpiCode);
      const target = pack.defaultTargets[kpiCode];

      await manager.query(
        `INSERT INTO project_kpi_configs (
          workspace_id, project_id, kpi_definition_id,
          enabled, target
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (project_id, kpi_definition_id) DO NOTHING`,
        [
          payload.workspaceId,
          projectId,
          kpiDefinitionId,
          true,
          target?.value || null,
        ],
      );
      count++;
    }

    return count;
  }

}
