import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Template } from '../../templates/entities/template.entity';
import {
  GovernanceRuleSet,
  ScopeType,
  EnforcementMode,
} from '../entities/governance-rule-set.entity';
import { GovernanceRule } from '../entities/governance-rule.entity';
import { GovernanceRuleActiveVersion } from '../entities/governance-rule-active-version.entity';
import { GovernanceRuleResolverService } from './governance-rule-resolver.service';

export type PolicyCatalogItem = {
  code: string;
  name: string;
  description: string;
  entityType: string;
  enforcementMode: string;
  enabled: boolean;
  systemRuleSetId: string;
  templateRuleSetId: string | null;
  ruleDefinition: Record<string, unknown>;
};

/** Minimal project fields required to snapshot TEMPLATE governance onto PROJECT scope. */
export type GovernanceProjectSnapshotRef = {
  id: string;
  organizationId: string;
  workspaceId: string;
};

/** Stable catalog codes seeded by migrations `18000000000067` + definition stabilization `18000000000068`. */
export const GOVERNANCE_POLICY_CODES: readonly string[] = [
  'phase-gate-approval',
  'deliverable-doc-required',
  'scope-change-control',
  'task-completion-signoff',
  'wip-limits',
  'risk-threshold-alert',
  'mandatory-fields',
  'budget-threshold',
] as const;

const POLICY_TITLES: Record<string, string> = {
  'phase-gate-approval': 'Phase gate approval',
  'deliverable-doc-required': 'Deliverable document required',
  'scope-change-control': 'Scope change control',
  'task-completion-signoff': 'Task completion sign-off',
  'wip-limits': 'WIP limits',
  'risk-threshold-alert': 'Risk threshold alert',
  'mandatory-fields': 'Mandatory fields',
  'budget-threshold': 'Budget threshold',
};

const POLICY_DESCRIPTIONS: Record<string, string> = {
  'phase-gate-approval':
    'Block phase advancement until deliverables reviewed and approved.',
  'deliverable-doc-required':
    'Phase cannot close without at least one attached document.',
  'scope-change-control':
    'New tasks created after planning phase require approval.',
  'task-completion-signoff':
    'Tasks marked Done require reviewer confirmation.',
  'wip-limits': 'Maximum tasks in progress per assignee or column.',
  'risk-threshold-alert':
    'Alert when high-priority task count exceeds threshold.',
  'mandatory-fields':
    'Required fields must be filled before task leaves To Do.',
  'budget-threshold':
    'Alert when project costs exceed percentage of allocated budget.',
};

function governanceEnforcementRank(mode: string): number {
  switch (mode) {
    case EnforcementMode.BLOCK:
      return 3;
    case EnforcementMode.ADMIN_OVERRIDE:
      return 4;
    case EnforcementMode.WARN:
      return 2;
    default:
      return 1;
  }
}

@Injectable()
export class GovernanceTemplateService {
  private readonly logger = new Logger(GovernanceTemplateService.name);

  constructor(
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
    @InjectRepository(GovernanceRuleSet)
    private readonly ruleSetRepo: Repository<GovernanceRuleSet>,
    @InjectRepository(GovernanceRule)
    private readonly ruleRepo: Repository<GovernanceRule>,
    @InjectRepository(GovernanceRuleActiveVersion)
    private readonly activeVersionRepo: Repository<GovernanceRuleActiveVersion>,
    private readonly resolverService: GovernanceRuleResolverService,
    private readonly dataSource: DataSource,
  ) {}

  async assertTemplateInOrganization(
    templateId: string,
    organizationId: string,
  ): Promise<Template> {
    const tpl = await this.templateRepo.findOne({
      where: [
        { id: templateId, isSystem: true, isActive: true },
        { id: templateId, organizationId, isActive: true },
      ],
    });
    if (!tpl) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'Template not found',
      });
    }
    return tpl;
  }

  /**
   * Snapshot TEMPLATE-scoped governance rule sets onto PROJECT scope inside the
   * caller's transaction so template edits do not mutate running projects.
   * Removes existing PROJECT-scoped sets for the project first.
   */
  async snapshotTemplateGovernanceToProject(
    manager: EntityManager,
    templateId: string,
    project: GovernanceProjectSnapshotRef,
  ): Promise<void> {
    const setRepo = manager.getRepository(GovernanceRuleSet);
    await setRepo.delete({
      scopeType: ScopeType.PROJECT,
      scopeId: project.id,
    });

    const templateSets = await setRepo.find({
      where: {
        scopeType: ScopeType.TEMPLATE,
        scopeId: templateId,
        isActive: true,
      },
    });
    if (templateSets.length === 0) {
      return;
    }

    const ruleRepo = manager.getRepository(GovernanceRule);
    const avRepo = manager.getRepository(GovernanceRuleActiveVersion);

    for (const templateSet of templateSets) {
      const projectSet = setRepo.create({
        organizationId: project.organizationId,
        workspaceId: project.workspaceId,
        scopeType: ScopeType.PROJECT,
        scopeId: project.id,
        entityType: templateSet.entityType,
        name: `Project governance (${templateSet.entityType})`,
        description: `Copied from template ${templateId}`,
        enforcementMode: templateSet.enforcementMode,
        isActive: true,
        createdBy: null,
      });
      const savedSet = await setRepo.save(projectSet);

      const avs = await avRepo.find({
        where: { ruleSetId: templateSet.id },
      });
      for (const av of avs) {
        const sourceRule = await ruleRepo.findOne({
          where: { id: av.activeRuleId },
        });
        if (!sourceRule) continue;

        const projectRule = ruleRepo.create({
          ruleSetId: savedSet.id,
          code: av.code,
          version: 1,
          isActive: true,
          ruleDefinition: sourceRule.ruleDefinition,
          createdBy: null,
        });
        const savedRule = await ruleRepo.save(projectRule);
        await avRepo.save(
          avRepo.create({
            ruleSetId: savedSet.id,
            code: av.code,
            activeRuleId: savedRule.id,
          }),
        );
      }
    }
  }

  async getTemplateGovernance(
    templateId: string,
    organizationId: string,
  ): Promise<PolicyCatalogItem[]> {
    await this.assertTemplateInOrganization(templateId, organizationId);

    /**
     * Join active_versions → rule_sets in one query so enablement survives refresh/login
     * regardless of duplicate TEMPLATE sets or relation load quirks. If the same policy
     * code appears twice (data anomaly), prefer the stricter enforcement mode.
     */
    const rawRows = await this.activeVersionRepo
      .createQueryBuilder('av')
      .innerJoin(GovernanceRuleSet, 'rs', 'rs.id = av.rule_set_id')
      .where('rs.scope_type = :st', { st: ScopeType.TEMPLATE })
      .andWhere('rs.scope_id = :tid', { tid: templateId })
      .andWhere('rs.is_active = :ia', { ia: true })
      .select('av.code', 'code')
      .addSelect('av.rule_set_id', 'ruleSetId')
      .addSelect('rs.enforcement_mode', 'enforcementMode')
      .getRawMany<{
        code: string;
        ruleSetId: string;
        enforcementMode: string;
      }>();

    const enabledByCode = new Map<
      string,
      { ruleSetId: string; enforcementMode: string }
    >();
    for (const row of rawRows) {
      if (!row?.code) continue;
      const next = {
        ruleSetId: row.ruleSetId,
        enforcementMode: row.enforcementMode ?? EnforcementMode.OFF,
      };
      const prev = enabledByCode.get(row.code);
      if (
        !prev ||
        governanceEnforcementRank(next.enforcementMode) >
          governanceEnforcementRank(prev.enforcementMode)
      ) {
        enabledByCode.set(row.code, next);
      }
    }

    if (rawRows.length > GOVERNANCE_POLICY_CODES.length) {
      this.logger.debug(
        `Template ${templateId}: ${rawRows.length} active-version rows (check for duplicate TEMPLATE rule sets)`,
      );
    }

    const catalog: PolicyCatalogItem[] = [];

    for (const code of GOVERNANCE_POLICY_CODES) {
      const systemRule = await this.findLatestSystemRule(code);
      if (!systemRule?.ruleSet) {
        continue;
      }
      const systemSet = systemRule.ruleSet;

      const match = enabledByCode.get(code);
      const enabled = Boolean(match);

      catalog.push({
        code,
        name: POLICY_TITLES[code] ?? code,
        description: POLICY_DESCRIPTIONS[code] ?? '',
        entityType: systemSet.entityType,
        enforcementMode: match?.enforcementMode ?? systemSet.enforcementMode,
        enabled,
        systemRuleSetId: systemSet.id,
        templateRuleSetId: match?.ruleSetId ?? null,
        ruleDefinition: (systemRule.ruleDefinition ?? {}) as Record<
          string,
          unknown
        >,
      });
    }

    return catalog;
  }

  async bulkToggleTemplatePolicies(
    templateId: string,
    toggles: Record<string, boolean>,
    organizationId: string,
  ): Promise<void> {
    const tpl = await this.assertTemplateInOrganization(
      templateId,
      organizationId,
    );
    for (const [code, enabled] of Object.entries(toggles)) {
      if (!GOVERNANCE_POLICY_CODES.includes(code)) {
        throw new BadRequestException({
          code: 'UNKNOWN_GOVERNANCE_POLICY',
          message: `Unknown governance policy code: ${code}`,
        });
      }
      await this.toggleTemplatePolicy(
        templateId,
        code,
        Boolean(enabled),
        organizationId,
        tpl,
      );
    }
    this.resolverService.invalidateCache();
  }

  private async toggleTemplatePolicy(
    templateId: string,
    policyCode: string,
    enabled: boolean,
    organizationId: string,
    tpl: Template,
  ): Promise<void> {
    if (tpl.organizationId && tpl.organizationId !== organizationId) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'Template not found',
      });
    }

    const systemRule = await this.findLatestSystemRule(policyCode);
    if (!systemRule?.ruleSet) {
      throw new NotFoundException({
        code: 'GOVERNANCE_POLICY_NOT_FOUND',
        message: `Policy ${policyCode} not found`,
      });
    }

    const entityType = systemRule.ruleSet.entityType;

    let templateSet = await this.ruleSetRepo
      .createQueryBuilder('rs')
      .where('rs.scope_type = :st', { st: ScopeType.TEMPLATE })
      .andWhere('rs.scope_id = :sid', { sid: templateId })
      .andWhere('rs.entity_type = :et', { et: entityType })
      .andWhere('rs.is_active = :ia', { ia: true })
      .orderBy('rs.updated_at', 'DESC')
      .getOne();

    if (!templateSet) {
      templateSet = this.ruleSetRepo.create({
        organizationId: tpl.organizationId ?? organizationId,
        workspaceId: tpl.workspaceId ?? null,
        scopeType: ScopeType.TEMPLATE,
        scopeId: templateId,
        entityType,
        name: `Template governance (${entityType})`,
        description: `Governance overrides for template ${templateId}`,
        enforcementMode: EnforcementMode.BLOCK,
        isActive: true,
        createdBy: null,
      });
      templateSet = await this.ruleSetRepo.save(templateSet);
    } else if (enabled) {
      templateSet.enforcementMode = EnforcementMode.BLOCK;
      await this.ruleSetRepo.save(templateSet);
    }

    let templateRule = await this.ruleRepo.findOne({
      where: { ruleSetId: templateSet.id, code: policyCode, version: 1 },
    });

    if (!templateRule) {
      if (enabled) {
        templateRule = this.ruleRepo.create({
          ruleSetId: templateSet.id,
          code: policyCode,
          version: 1,
          isActive: true,
          ruleDefinition: systemRule.ruleDefinition,
          createdBy: null,
        });
        templateRule = await this.ruleRepo.save(templateRule);
      }
    } else {
      templateRule.ruleDefinition = systemRule.ruleDefinition;
      await this.ruleRepo.save(templateRule);
    }

    if (enabled) {
      if (!templateRule) {
        throw new NotFoundException({
          code: 'GOVERNANCE_TEMPLATE_RULE_MISSING',
          message: `Failed to persist template rule for ${policyCode}`,
        });
      }
      const existing = await this.activeVersionRepo.findOne({
        where: { ruleSetId: templateSet.id, code: policyCode },
      });
      if (existing) {
        existing.activeRuleId = templateRule.id;
        await this.activeVersionRepo.save(existing);
      } else {
        await this.activeVersionRepo.save(
          this.activeVersionRepo.create({
            ruleSetId: templateSet.id,
            code: policyCode,
            activeRuleId: templateRule.id,
          }),
        );
      }
    } else {
      await this.activeVersionRepo.delete({
        ruleSetId: templateSet.id,
        code: policyCode,
      });
      const remaining = await this.activeVersionRepo.count({
        where: { ruleSetId: templateSet.id },
      });
      if (remaining === 0) {
        templateSet.enforcementMode = EnforcementMode.OFF;
        await this.ruleSetRepo.save(templateSet);
      }
    }
  }

  async listSystemPolicyCatalog(organizationId: string): Promise<
    Array<{
      code: string;
      name: string;
      entityType: string;
      enforcementMode: string;
      ruleDefinition: Record<string, unknown>;
      activeOnTemplates: number;
    }>
  > {
    const usageRows: Array<{ code: string; cnt: string }> =
      await this.dataSource.query(
        `
        SELECT gav.code AS code, COUNT(DISTINCT rs.scope_id)::text AS cnt
        FROM governance_rule_sets rs
        INNER JOIN governance_rule_active_versions gav ON gav.rule_set_id = rs.id
        INNER JOIN templates t ON t.id = rs.scope_id
        WHERE rs.scope_type = 'TEMPLATE'
          AND rs.is_active = true
          AND (t.organization_id = $1 OR t.is_system = true)
        GROUP BY gav.code
      `,
        [organizationId],
      );
    const usage = new Map<string, number>();
    for (const r of usageRows) {
      usage.set(r.code, parseInt(r.cnt, 10) || 0);
    }

    const out: Array<{
      code: string;
      name: string;
      entityType: string;
      enforcementMode: string;
      ruleDefinition: Record<string, unknown>;
      activeOnTemplates: number;
    }> = [];

    for (const code of GOVERNANCE_POLICY_CODES) {
      const systemRule = await this.findLatestSystemRule(code);
      if (!systemRule?.ruleSet) continue;
      out.push({
        code,
        name: POLICY_TITLES[code] ?? code,
        entityType: systemRule.ruleSet.entityType,
        enforcementMode: systemRule.ruleSet.enforcementMode,
        ruleDefinition: (systemRule.ruleDefinition ?? {}) as Record<
          string,
          unknown
        >,
        activeOnTemplates: usage.get(code) ?? 0,
      });
    }
    return out;
  }

  private async findLatestSystemRule(
    code: string,
  ): Promise<GovernanceRule | null> {
    return this.ruleRepo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.ruleSet', 'rs')
      .where('r.code = :code', { code })
      .andWhere('rs.scope_type = :st', { st: ScopeType.SYSTEM })
      .orderBy('r.version', 'DESC')
      .getOne();
  }
}
