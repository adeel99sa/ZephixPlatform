import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  GovernanceEntityType,
  EnforcementMode,
  ScopeType,
} from '../modules/governance-rules/entities/governance-rule-set.entity';
import { GovernanceRuleSet } from '../modules/governance-rules/entities/governance-rule-set.entity';
import { GovernanceRule } from '../modules/governance-rules/entities/governance-rule.entity';
import { GovernanceRuleActiveVersion } from '../modules/governance-rules/entities/governance-rule-active-version.entity';
import { ConditionSeverity } from '../modules/governance-rules/entities/governance-rule.entity';

type SeedPolicy = {
  code: string;
  entityType: GovernanceEntityType;
  name: string;
  description: string;
  ruleDefinition: Record<string, unknown>;
};

/**
 * Idempotent seed: SYSTEM rule sets per entity type + 8 catalog rules.
 * All sets use enforcement OFF so the catalog ships without blocking production;
 * TEMPLATE / PROJECT scoped copies use BLOCK/WARN when operators enable policies.
 */
const SYSTEM_POLICIES: SeedPolicy[] = [
  {
    code: 'phase-gate-approval',
    entityType: GovernanceEntityType.PHASE_GATE,
    name: 'Phase gate approval',
    description:
      'Block phase advancement until deliverables reviewed and approved.',
    ruleDefinition: {
      conditions: [
        {
          type: 'APPROVALS_MET',
          params: { requiredCount: 0 },
        },
      ],
      message: 'Phase advancement requires approval (configure approvals in PR #139).',
      severity: ConditionSeverity.ERROR,
    },
  },
  {
    code: 'deliverable-doc-required',
    entityType: GovernanceEntityType.PHASE_GATE,
    name: 'Deliverable document required',
    description: 'Phase cannot close without attached documents.',
    ruleDefinition: {
      conditions: [
        {
          type: 'EXISTS_RELATED',
          relatedEntity: 'documents',
          params: { minCount: 1 },
        },
      ],
      message: 'At least one document must be attached before closing phase.',
      severity: ConditionSeverity.ERROR,
    },
  },
  {
    code: 'scope-change-control',
    entityType: GovernanceEntityType.TASK,
    name: 'Scope change control',
    description: 'New tasks after planning phase require approval.',
    ruleDefinition: {
      conditions: [],
      message:
        'Adding tasks after planning phase requires governance approval (hook in PR #139).',
      severity: ConditionSeverity.ERROR,
    },
  },
  {
    code: 'task-completion-signoff',
    entityType: GovernanceEntityType.TASK,
    name: 'Task completion sign-off',
    description: 'Tasks marked Done require reviewer confirmation.',
    ruleDefinition: {
      when: { toStatus: 'DONE' },
      conditions: [
        {
          type: 'APPROVALS_MET',
          params: { requiredCount: 0 },
        },
      ],
      message: 'Task completion requires sign-off (wire approvals in PR #139).',
      severity: ConditionSeverity.ERROR,
    },
  },
  {
    code: 'wip-limits',
    entityType: GovernanceEntityType.TASK,
    name: 'WIP limits',
    description: 'Maximum tasks in progress per assignee or column.',
    ruleDefinition: {
      when: { toStatus: 'IN_PROGRESS' },
      conditions: [],
      message: 'Work in progress limit exceeded (enforcement in PR #139).',
      severity: ConditionSeverity.WARNING,
    },
  },
  {
    code: 'risk-threshold-alert',
    entityType: GovernanceEntityType.TASK,
    name: 'Risk threshold alert',
    description: 'Alert when high-priority task count exceeds threshold.',
    ruleDefinition: {
      conditions: [],
      message: 'High-priority task threshold exceeded (enforcement in PR #139).',
      severity: ConditionSeverity.WARNING,
    },
  },
  {
    code: 'mandatory-fields',
    entityType: GovernanceEntityType.TASK,
    name: 'Mandatory fields',
    description: 'Required fields before task leaves To Do.',
    ruleDefinition: {
      when: { fromStatus: 'TODO' },
      conditions: [
        { type: 'FIELD_NOT_EMPTY', field: 'assigneeUserId' },
        { type: 'FIELD_NOT_EMPTY', field: 'dueDate' },
      ],
      message: 'Assignee and due date are required before moving from To Do.',
      severity: ConditionSeverity.ERROR,
    },
  },
  {
    code: 'budget-threshold',
    entityType: GovernanceEntityType.PROJECT,
    name: 'Budget threshold',
    description: 'Alert when project costs exceed percentage of budget.',
    ruleDefinition: {
      conditions: [],
      message: 'Project budget threshold exceeded (finance domain in PR #139).',
      severity: ConditionSeverity.WARNING,
    },
  },
];

function systemSetName(entityType: GovernanceEntityType): string {
  return `System ${entityType} Governance Policies`;
}

export class SeedGovernancePolicyCatalog18000000000067
  implements MigrationInterface
{
  name = 'SeedGovernancePolicyCatalog18000000000067';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const setRepo = queryRunner.manager.getRepository(GovernanceRuleSet);
    const ruleRepo = queryRunner.manager.getRepository(GovernanceRule);
    const avRepo = queryRunner.manager.getRepository(GovernanceRuleActiveVersion);

    const byEntity = new Map<GovernanceEntityType, SeedPolicy[]>();
    for (const p of SYSTEM_POLICIES) {
      const list = byEntity.get(p.entityType) ?? [];
      list.push(p);
      byEntity.set(p.entityType, list);
    }

    for (const [entityType] of byEntity) {
      const policies = byEntity.get(entityType)!;
      const setName = systemSetName(entityType);
      let ruleSet = await setRepo.findOne({
        where: {
          scopeType: ScopeType.SYSTEM,
          entityType,
          name: setName,
        },
      });

      if (!ruleSet) {
        ruleSet = setRepo.create({
          organizationId: null,
          workspaceId: null,
          scopeType: ScopeType.SYSTEM,
          scopeId: null,
          entityType,
          name: setName,
          description: `PMBOK 7+8 aligned governance policies for ${entityType} entities.`,
          enforcementMode: EnforcementMode.OFF,
          isActive: true,
          createdBy: null,
        });
        ruleSet = await setRepo.save(ruleSet);
      }

      for (const policy of policies) {
        const existingRule = await ruleRepo.findOne({
          where: { ruleSetId: ruleSet.id, code: policy.code, version: 1 },
        });
        if (existingRule) {
          continue;
        }

        const rule = ruleRepo.create({
          ruleSetId: ruleSet.id,
          code: policy.code,
          version: 1,
          isActive: true,
          ruleDefinition: policy.ruleDefinition as any,
          createdBy: null,
        });
        const savedRule = await ruleRepo.save(rule);

        const existingAv = await avRepo.findOne({
          where: { ruleSetId: ruleSet.id, code: policy.code },
        });
        if (existingAv) {
          existingAv.activeRuleId = savedRule.id;
          await avRepo.save(existingAv);
        } else {
          await avRepo.save(
            avRepo.create({
              ruleSetId: ruleSet.id,
              code: policy.code,
              activeRuleId: savedRule.id,
            }),
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const names = [
      systemSetName(GovernanceEntityType.TASK),
      systemSetName(GovernanceEntityType.PROJECT),
      systemSetName(GovernanceEntityType.PHASE_GATE),
    ];
    await queryRunner.query(
      `DELETE FROM governance_rule_sets
       WHERE scope_type = 'SYSTEM' AND name = ANY($1::text[])`,
      [names],
    );
  }
}
