import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SYSTEM catalog only: enforceable scope-change (creation + admin role) and
 * task completion assignee check. Scoped to SYSTEM rule sets so TEMPLATE copies
 * are not overwritten here (template service syncs from SYSTEM on toggle).
 */
const SYSTEM_FILTER = `rule_set_id IN (SELECT id FROM governance_rule_sets WHERE scope_type = 'SYSTEM')`;

const SCOPE_CHANGE_CONTROL_UP = {
  when: { creationOnly: true },
  conditions: [
    { type: 'ROLE_ALLOWED', params: { roles: ['ADMIN'] } },
  ],
  message:
    'Only organization admins may create tasks when this policy is enabled on the project template.',
  severity: 'ERROR',
};

const SCOPE_CHANGE_CONTROL_DOWN = {
  conditions: [],
  message:
    'Adding tasks after planning phase requires governance approval (hook in PR #139).',
  severity: 'ERROR',
};

const TASK_SIGNOFF_UP = {
  when: { toStatus: 'DONE' },
  conditions: [{ type: 'FIELD_NOT_EMPTY', field: 'assigneeUserId' }],
  message: 'Task must have an assignee before marking as Done.',
  severity: 'ERROR',
};

const TASK_SIGNOFF_DOWN = {
  when: { toStatus: 'DONE' },
  conditions: [],
  message: 'Task completion requires sign-off (wire approvals in PR #139).',
  severity: 'ERROR',
};

export class EnforceableScopeChangeAndTaskSignoffCatalog18000000000069
  implements MigrationInterface
{
  name = 'EnforceableScopeChangeAndTaskSignoffCatalog18000000000069';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE governance_rules SET rule_definition = $1::jsonb
       WHERE code = 'scope-change-control' AND version = 1 AND ${SYSTEM_FILTER}`,
      [JSON.stringify(SCOPE_CHANGE_CONTROL_UP)],
    );
    await queryRunner.query(
      `UPDATE governance_rules SET rule_definition = $1::jsonb
       WHERE code = 'task-completion-signoff' AND version = 1 AND ${SYSTEM_FILTER}`,
      [JSON.stringify(TASK_SIGNOFF_UP)],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE governance_rules SET rule_definition = $1::jsonb
       WHERE code = 'scope-change-control' AND version = 1 AND ${SYSTEM_FILTER}`,
      [JSON.stringify(SCOPE_CHANGE_CONTROL_DOWN)],
    );
    await queryRunner.query(
      `UPDATE governance_rules SET rule_definition = $1::jsonb
       WHERE code = 'task-completion-signoff' AND version = 1 AND ${SYSTEM_FILTER}`,
      [JSON.stringify(TASK_SIGNOFF_DOWN)],
    );
  }
}
