import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Expand the audit_events.action CHECK constraint and task_activities_type_enum
 * to include domain-specific actions added in Sprint 5 work-management code.
 *
 * Fixes:
 *  1. Phase creation fails: CHK_audit_events_action does not include PHASE_CREATED etc.
 *  2. AC update fails: task_activities_type_enum does not include TASK_ACCEPTANCE_CRITERIA_UPDATED
 */
export class ExpandAuditActionAndTaskActivityEnums17980244000000
  implements MigrationInterface
{
  name = 'ExpandAuditActionAndTaskActivityEnums17980244000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Drop and recreate audit_events action CHECK constraint ──────────
    await queryRunner.query(`
      ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "CHK_audit_events_action";
    `);

    await queryRunner.query(`
      ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_action"
        CHECK (action IN (
          -- Original Phase 3B actions
          'create','update','delete','activate','compute',
          'attach','detach','invite','accept','suspend','reinstate',
          'upload_complete','download_link','presign_create',
          'quota_block','plan_status_block','wip_override','role_change',
          -- Work-management domain actions (Phase/Task/Sprint)
          'PHASE_CREATED','PHASE_UPDATED','PHASE_REORDERED','PHASE_RESTORED','PHASE_DELETED',
          'TASK_CREATED','TASK_UPDATED','TASK_DELETED','TASK_RESTORED',
          'TASK_STATUS_CHANGED','TASK_ASSIGNED','TASK_MOVED',
          'SPRINT_CREATED','SPRINT_UPDATED','SPRINT_STARTED','SPRINT_COMPLETED',
          -- Change request / document / budget actions
          'CHANGE_REQUEST_CREATED','CHANGE_REQUEST_UPDATED','CHANGE_REQUEST_APPROVED','CHANGE_REQUEST_REJECTED',
          'DOCUMENT_CREATED','DOCUMENT_UPDATED','DOCUMENT_DELETED',
          'BUDGET_UPDATED','BUDGET_APPROVED',
          -- Policy / gate actions
          'GATE_CREATED','GATE_EVALUATED','GATE_PASSED','GATE_FAILED',
          'POLICY_CREATED','POLICY_UPDATED','POLICY_DELETED',
          -- Template activation
          'TEMPLATE_ACTIVATED','TEMPLATE_DEACTIVATED',
          -- Phase transitions
          'PHASE_TRANSITION_REQUESTED','PHASE_TRANSITION_APPROVED','PHASE_TRANSITION_REJECTED'
        ));
    `);

    // ── 2. Add missing task_activities_type_enum values ────────────────────
    const needed = [
      'TASK_ACCEPTANCE_CRITERIA_UPDATED',
      'TASK_WIP_OVERRIDE',
      'TASK_DOD_UPDATED',
    ];

    for (const val of needed) {
      // ADD VALUE IF NOT EXISTS is Postgres 10+ safe and idempotent
      await queryRunner.query(
        `ALTER TYPE task_activities_type_enum ADD VALUE IF NOT EXISTS '${val}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to original CHECK constraint
    await queryRunner.query(`
      ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "CHK_audit_events_action";
    `);
    await queryRunner.query(`
      ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_action"
        CHECK (action IN (
          'create','update','delete','activate','compute',
          'attach','detach','invite','accept','suspend','reinstate',
          'upload_complete','download_link','presign_create',
          'quota_block','plan_status_block','wip_override','role_change'
        ));
    `);
    // Cannot remove values from PostgreSQL enums without recreating the type — no-op
  }
}
