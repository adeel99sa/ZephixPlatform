import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Expand CHECK constraints on audit_events to allow auth-related
 * entity types and actions used by the enterprise signup flow.
 *
 * CHK_audit_events_entity_type: add 'user', 'email_verification'
 * CHK_audit_events_action: add 'user_registered', 'org_created',
 *   'email_verification_sent', 'email_verified', 'resend_verification'
 */
export class ExpandAuditCheckConstraintsForAuth18000000000013
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "CHK_audit_events_entity_type";
    `);

    await queryRunner.query(`
      ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_entity_type"
      CHECK (entity_type IN (
        'organization','workspace','project','portfolio',
        'work_task','work_risk','doc','attachment',
        'scenario_plan','scenario_action','scenario_result',
        'baseline','capacity_calendar','billing_plan','entitlement',
        'webhook','board_move',
        'PHASE','TASK','SPRINT','RISK','ALLOCATION',
        'CHANGE_REQUEST','DOCUMENT','BUDGET','GATE','POLICY',
        'TEMPLATE','TEMPLATE_ACTIVATION','TAILORING_PROFILE',
        'user','email_verification'
      ));
    `);

    await queryRunner.query(`
      ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "CHK_audit_events_action";
    `);

    await queryRunner.query(`
      ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_action"
      CHECK (action IN (
        'create','update','delete','activate','compute',
        'attach','detach','invite','accept','suspend','reinstate',
        'upload_complete','download_link','presign_create',
        'quota_block','plan_status_block','wip_override','role_change',
        'PHASE_CREATED','PHASE_UPDATED','PHASE_REORDERED',
        'PHASE_RESTORED','PHASE_DELETED',
        'TASK_CREATED','TASK_UPDATED','TASK_DELETED',
        'TASK_RESTORED','TASK_STATUS_CHANGED','TASK_ASSIGNED','TASK_MOVED',
        'SPRINT_CREATED','SPRINT_UPDATED','SPRINT_STARTED','SPRINT_COMPLETED',
        'CHANGE_REQUEST_CREATED','CHANGE_REQUEST_UPDATED',
        'CHANGE_REQUEST_APPROVED','CHANGE_REQUEST_REJECTED',
        'DOCUMENT_CREATED','DOCUMENT_UPDATED','DOCUMENT_DELETED',
        'BUDGET_UPDATED','BUDGET_APPROVED',
        'GATE_CREATED','GATE_EVALUATED','GATE_PASSED','GATE_FAILED',
        'POLICY_CREATED','POLICY_UPDATED','POLICY_DELETED',
        'TEMPLATE_ACTIVATED','TEMPLATE_DEACTIVATED',
        'PHASE_TRANSITION_REQUESTED','PHASE_TRANSITION_APPROVED',
        'PHASE_TRANSITION_REJECTED',
        'user_registered','org_created',
        'email_verification_sent','email_verified','resend_verification'
      ));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "CHK_audit_events_entity_type";
    `);

    await queryRunner.query(`
      ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_entity_type"
      CHECK (entity_type IN (
        'organization','workspace','project','portfolio',
        'work_task','work_risk','doc','attachment',
        'scenario_plan','scenario_action','scenario_result',
        'baseline','capacity_calendar','billing_plan','entitlement',
        'webhook','board_move',
        'PHASE','TASK','SPRINT','RISK','ALLOCATION',
        'CHANGE_REQUEST','DOCUMENT','BUDGET','GATE','POLICY',
        'TEMPLATE','TEMPLATE_ACTIVATION','TAILORING_PROFILE'
      ));
    `);

    await queryRunner.query(`
      ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "CHK_audit_events_action";
    `);

    await queryRunner.query(`
      ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_action"
      CHECK (action IN (
        'create','update','delete','activate','compute',
        'attach','detach','invite','accept','suspend','reinstate',
        'upload_complete','download_link','presign_create',
        'quota_block','plan_status_block','wip_override','role_change',
        'PHASE_CREATED','PHASE_UPDATED','PHASE_REORDERED',
        'PHASE_RESTORED','PHASE_DELETED',
        'TASK_CREATED','TASK_UPDATED','TASK_DELETED',
        'TASK_RESTORED','TASK_STATUS_CHANGED','TASK_ASSIGNED','TASK_MOVED',
        'SPRINT_CREATED','SPRINT_UPDATED','SPRINT_STARTED','SPRINT_COMPLETED',
        'CHANGE_REQUEST_CREATED','CHANGE_REQUEST_UPDATED',
        'CHANGE_REQUEST_APPROVED','CHANGE_REQUEST_REJECTED',
        'DOCUMENT_CREATED','DOCUMENT_UPDATED','DOCUMENT_DELETED',
        'BUDGET_UPDATED','BUDGET_APPROVED',
        'GATE_CREATED','GATE_EVALUATED','GATE_PASSED','GATE_FAILED',
        'POLICY_CREATED','POLICY_UPDATED','POLICY_DELETED',
        'TEMPLATE_ACTIVATED','TEMPLATE_DEACTIVATED',
        'PHASE_TRANSITION_REQUESTED','PHASE_TRANSITION_APPROVED',
        'PHASE_TRANSITION_REJECTED'
      ));
    `);
  }
}
