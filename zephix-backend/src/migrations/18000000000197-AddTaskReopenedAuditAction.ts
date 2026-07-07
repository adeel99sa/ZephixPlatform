import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WM-A2a: Add TASK_REOPENED to the audit_events action CHECK constraint.
 *
 * TASK_REOPENED is emitted by WorkTasksService when a task transitions out
 * of a terminal bucket (done/cancelled) back to an open status.
 *
 * Pattern follows migration 083: drop + recreate the constraint with the
 * full prior allow-list preserved + the new value appended.
 */
export class AddTaskReopenedAuditAction18000000000197
  implements MigrationInterface
{
  name = 'AddTaskReopenedAuditAction18000000000197';

  private readonly actionConstraintName = 'CHK_audit_events_action';

  /** Full allow-list: prior values from migration 083 + TASK_REOPENED. */
  private readonly allValues = [
    // Phase 3B lowercase actions
    'create', 'update', 'delete', 'activate', 'compute',
    'attach', 'detach', 'invite', 'accept', 'suspend', 'reinstate',
    'upload_complete', 'download_link', 'presign_create',
    'quota_block', 'plan_status_block', 'wip_override', 'role_change',
    // Uppercase work-management actions
    'PHASE_CREATED', 'PHASE_UPDATED', 'PHASE_REORDERED', 'PHASE_RESTORED', 'PHASE_DELETED',
    'TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'TASK_RESTORED',
    'TASK_STATUS_CHANGED', 'TASK_ASSIGNED', 'TASK_MOVED',
    'SPRINT_CREATED', 'SPRINT_UPDATED', 'SPRINT_STARTED', 'SPRINT_COMPLETED',
    'CHANGE_REQUEST_CREATED', 'CHANGE_REQUEST_UPDATED',
    'CHANGE_REQUEST_APPROVED', 'CHANGE_REQUEST_REJECTED',
    'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED',
    'BUDGET_UPDATED', 'BUDGET_APPROVED',
    'GATE_CREATED', 'GATE_EVALUATED', 'GATE_PASSED', 'GATE_FAILED',
    'POLICY_CREATED', 'POLICY_UPDATED', 'POLICY_DELETED',
    'TEMPLATE_ACTIVATED', 'TEMPLATE_DEACTIVATED',
    'PHASE_TRANSITION_REQUESTED', 'PHASE_TRANSITION_APPROVED', 'PHASE_TRANSITION_REJECTED',
    // Auth/lifecycle actions
    'user_registered', 'org_created',
    'email_verification_sent', 'email_verified', 'resend_verification',
    'email_verification_bypassed', 'password_reset_requested', 'password_reset_completed',
    'governance_evaluate', 'guard_allow', 'guard_deny',
    // Migration 082 additions
    'ACK_CONSUMED', 'PHASE_UPDATED_WITH_ACK',
    'soft_remove_to_trash', 'restore_from_trash',
    'retention_purge_batch', 'permanent_delete_from_trash',
    // Migration 083 additions (Template Center)
    'TEMPLATE_APPLIED', 'TEMPLATE_APPLY_FAILED',
    'GATE_DECIDE', 'GATE_DECIDE_BLOCKED',
    'DOC_TRANSITION', 'DOCUMENT_TRANSITION_FAILED',
    // === NEW: WM-A2a reopen event ===
    'TASK_REOPENED',
  ];

  private readonly priorValues = this.allValues.filter(
    (v) => v !== 'TASK_REOPENED',
  );

  private buildSql(values: string[]): string {
    const quoted = values.map((v) => `'${v}'`).join(', ');
    return `ALTER TABLE audit_events ADD CONSTRAINT "${this.actionConstraintName}" CHECK (action IN (${quoted}))`;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Expand audit_events CHECK constraint (defensive — TASK_REOPENED flows
    //    to task_activities, but keeping it here for forward-compatibility).
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraintName}"`,
    );
    await queryRunner.query(this.buildSql(this.allValues));

    // 2. Add TASK_REOPENED to the task_activities_type_enum PostgreSQL enum.
    //    activityService.record() writes type=TASK_REOPENED to task_activities;
    //    without this the INSERT throws "invalid input value for enum".
    await queryRunner.query(
      `ALTER TYPE task_activities_type_enum ADD VALUE IF NOT EXISTS 'TASK_REOPENED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraintName}"`,
    );
    await queryRunner.query(this.buildSql(this.priorValues));
  }
}
