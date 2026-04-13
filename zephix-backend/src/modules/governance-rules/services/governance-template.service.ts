import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
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

/** Stable catalog codes seeded by migration `18000000000067-SeedGovernancePolicyCatalog`. */
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

@Injectable()
export class GovernanceTemplateService {
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

  async getTemplateGovernance(
    templateId: string,
    organizationId: string,
  ): Promise<PolicyCatalogItem[]> {
    await this.assertTemplateInOrganization(templateId, organizationId);

    const templateSets = await this.ruleSetRepo.find({
      where: {
        scopeType: ScopeType.TEMPLATE,
        scopeId: templateId,
        isActive: true,
      },
    });
    const templateSetIds = templateSets.map((s) => s.id);
    const templateAv =
      templateSetIds.length === 0
        ? []
        : await this.activeVersionRepo.find({
            where: { ruleSetId: In(templateSetIds) },
            relations: ['activeRule'],
          });

    const catalog: PolicyCatalogItem[] = [];

    for (const code of GOVERNANCE_POLICY_CODES) {
      const systemRule = await this.findLatestSystemRule(code);
      if (!systemRule?.ruleSet) {
        continue;
      }
      const systemSet = systemRule.ruleSet;

      const matchAv = templateAv.find((av) => av.code === code);
      const templateSet = matchAv
        ? templateSets.find((s) => s.id === matchAv.ruleSetId)
        : undefined;

      const enabled = Boolean(matchAv);

      catalog.push({
        code,
        name: POLICY_TITLES[code] ?? code,
        description: POLICY_DESCRIPTIONS[code] ?? '',
        entityType: systemSet.entityType,
        enforcementMode: templateSet?.enforcementMode ?? systemSet.enforcementMode,
        enabled,
        systemRuleSetId: systemSet.id,
        templateRuleSetId: templateSet?.id ?? null,
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

    let templateSet = await this.ruleSetRepo.findOne({
      where: {
        scopeType: ScopeType.TEMPLATE,
        scopeId: templateId,
        entityType,
        isActive: true,
      },
    });

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

    if (enabled) {
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
