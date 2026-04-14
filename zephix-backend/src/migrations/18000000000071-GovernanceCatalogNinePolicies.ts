import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  GovernanceEntityType,
  ScopeType,
} from '../modules/governance-rules/entities/governance-rule-set.entity';
import { GovernanceRuleSet } from '../modules/governance-rules/entities/governance-rule-set.entity';
import { GovernanceRule } from '../modules/governance-rules/entities/governance-rule.entity';
import { GovernanceRuleActiveVersion } from '../modules/governance-rules/entities/governance-rule-active-version.entity';

const SYSTEM_FILTER = `rule_set_id IN (SELECT id FROM governance_rule_sets WHERE scope_type = 'SYSTEM')`;

const SCOPE_CHANGE = {
  when: { creationOnly: true },
  conditions: [
    {
      type: 'ROLE_ALLOWED',
      params: { roles: ['ADMIN', 'workspace_owner', 'workspace_admin'] },
    },
  ],
  message:
    'Only organization or workspace admins may create tasks when this policy is enabled on the project template.',
  severity: 'ERROR',
};

const TASK_SIGNOFF = {
  when: { toStatus: 'DONE' },
  conditions: [{ type: 'FIELD_NOT_EMPTY', field: 'assigneeUserId' }],
  message: 'Task must have an assignee before marking as Done.',
  severity: 'ERROR',
};

const PHASE_GATE = {
  when: {},
  conditions: [],
  message:
    'Phase advancement requires approval (configure approvals in a future release).',
  severity: 'ERROR',
};

const DELIVERABLE_DOC = {
  when: {},
  conditions: [],
  message: 'At least one document must be attached before closing phase.',
  severity: 'ERROR',
};

const WIP_LIMITS = {
  when: { toStatus: 'IN_PROGRESS' },
  conditions: [],
  message: 'Work in progress limit exceeded (enforcement in a future release).',
  severity: 'WARNING',
};

const RISK_ALERT = {
  when: {},
  conditions: [],
  message:
    'High-priority task threshold exceeded (enforcement in a future release).',
  severity: 'WARNING',
};

const BUDGET = {
  when: {},
  conditions: [],
  message:
    'Project budget threshold exceeded (enforcement in a future release).',
  severity: 'WARNING',
};

const SCHEDULE_TOLERANCE = {
  when: {},
  conditions: [],
  message: 'Schedule variance escalation (enforcement in a future release).',
  severity: 'WARNING',
};

const RESOURCE_CAPACITY = {
  when: {},
  conditions: [],
  message: 'Resource allocation governance (enforcement in a future release).',
  severity: 'WARNING',
};

/**
 * Nine-policy SYSTEM catalog: honest evaluable definitions, two PROJECT placeholders,
 * remove mandatory-fields. All rule_definition UPDATEs scoped to SYSTEM sets only.
 */
export class GovernanceCatalogNinePolicies18000000000071
  implements MigrationInterface
{
  name = 'GovernanceCatalogNinePolicies18000000000071';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const upd = async (code: string, def: Record<string, unknown>) => {
      await queryRunner.query(
        `UPDATE governance_rules SET rule_definition = $1::jsonb
         WHERE code = $2 AND version = 1 AND ${SYSTEM_FILTER}`,
        [JSON.stringify(def), code],
      );
    };

    await upd('scope-change-control', SCOPE_CHANGE);
    await upd('task-completion-signoff', TASK_SIGNOFF);
    await upd('phase-gate-approval', PHASE_GATE);
    await upd('deliverable-doc-required', DELIVERABLE_DOC);
    await upd('wip-limits', WIP_LIMITS);
    await upd('risk-threshold-alert', RISK_ALERT);
    await upd('budget-threshold', BUDGET);

    await queryRunner.query(
      `DELETE FROM governance_rule_active_versions WHERE code = 'mandatory-fields'`,
    );
    await queryRunner.query(
      `DELETE FROM governance_rules WHERE code = 'mandatory-fields' AND version = 1`,
    );

    const setRepo = queryRunner.manager.getRepository(GovernanceRuleSet);
    const ruleRepo = queryRunner.manager.getRepository(GovernanceRule);
    const avRepo = queryRunner.manager.getRepository(GovernanceRuleActiveVersion);

    const projectSet = await setRepo.findOne({
      where: {
        scopeType: ScopeType.SYSTEM,
        entityType: GovernanceEntityType.PROJECT,
        name: 'System PROJECT Governance Policies',
      },
    });
    if (!projectSet) {
      return;
    }

    const ensureRule = async (
      code: string,
      def: Record<string, unknown>,
    ): Promise<void> => {
      const existing = await ruleRepo.findOne({
        where: { ruleSetId: projectSet.id, code, version: 1 },
      });
      if (existing) {
        existing.ruleDefinition = def as any;
        await ruleRepo.save(existing);
        const av = await avRepo.findOne({
          where: { ruleSetId: projectSet.id, code },
        });
        if (av) {
          av.activeRuleId = existing.id;
          await avRepo.save(av);
        } else {
          await avRepo.save(
            avRepo.create({
              ruleSetId: projectSet.id,
              code,
              activeRuleId: existing.id,
            }),
          );
        }
        return;
      }
      const rule = ruleRepo.create({
        ruleSetId: projectSet.id,
        code,
        version: 1,
        isActive: true,
        ruleDefinition: def as any,
        createdBy: null,
      });
      const saved = await ruleRepo.save(rule);
      await avRepo.save(
        avRepo.create({
          ruleSetId: projectSet.id,
          code,
          activeRuleId: saved.id,
        }),
      );
    };

    await ensureRule('schedule-tolerance', SCHEDULE_TOLERANCE);
    await ensureRule(
      'resource-capacity-governance',
      RESOURCE_CAPACITY,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    /* Forward-only catalog alignment. */
  }
}
