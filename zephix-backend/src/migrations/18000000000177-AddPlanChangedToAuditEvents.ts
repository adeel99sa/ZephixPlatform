import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A6 — extend `audit_events.action` CHECK constraint to allow
 * `plan_changed`.
 *
 * `AdminController.updateOrganizationPlan` emits this audit action when
 * a platform admin mutates an organization's `plan_code`. Without this
 * extension the AuditService.record() call would log + silently swallow
 * the write, leaving the plan change unaudited.
 *
 * Pattern mirrors migration 171 (complexity_mode_changed):
 *   - drop + recreate the constraint with the full prior allow-list
 *     preserved + the new value appended;
 *   - constraint is on `action` only — `entity_type` allow-list untouched.
 *
 * Risk: zero. Constraint expansion is purely additive. Existing rows
 * are unaffected. Reverse migration restores the post-171 allow-list.
 */
export class AddPlanChangedToAuditEvents18000000000177
  implements MigrationInterface
{
  name = 'AddPlanChangedToAuditEvents18000000000177';

  private readonly actionConstraintName = 'CHK_audit_events_action';

  /**
   * Prior allow-list = post-171 baseline. Must remain byte-identical to
   * migration 171's `allValues` so this constraint expands the same
   * baseline rather than shrinking unrelated values.
   */
  private readonly priorValues = [
    // Phase 3B lowercase actions
    'create',
    'update',
    'delete',
    'activate',
    'compute',
    'attach',
    'detach',
    'invite',
    'accept',
    'suspend',
    'reinstate',
    'upload_complete',
    'download_link',
    'presign_create',
    'quota_block',
    'plan_status_block',
    'wip_override',
    'role_change',
    // UPPERCASE work-management actions
    'PHASE_CREATED',
    'PHASE_UPDATED',
    'PHASE_REORDERED',
    'PHASE_RESTORED',
    'PHASE_DELETED',
    'TASK_CREATED',
    'TASK_UPDATED',
    'TASK_DELETED',
    'TASK_RESTORED',
    'TASK_STATUS_CHANGED',
    'TASK_ASSIGNED',
    'TASK_MOVED',
    'SPRINT_CREATED',
    'SPRINT_UPDATED',
    'SPRINT_STARTED',
    'SPRINT_COMPLETED',
    'CHANGE_REQUEST_CREATED',
    'CHANGE_REQUEST_UPDATED',
    'CHANGE_REQUEST_APPROVED',
    'CHANGE_REQUEST_REJECTED',
    'DOCUMENT_CREATED',
    'DOCUMENT_UPDATED',
    'DOCUMENT_DELETED',
    'BUDGET_UPDATED',
    'BUDGET_APPROVED',
    'GATE_CREATED',
    'GATE_EVALUATED',
    'GATE_PASSED',
    'GATE_FAILED',
    'POLICY_CREATED',
    'POLICY_UPDATED',
    'POLICY_DELETED',
    'TEMPLATE_ACTIVATED',
    'TEMPLATE_DEACTIVATED',
    'PHASE_TRANSITION_REQUESTED',
    'PHASE_TRANSITION_APPROVED',
    'PHASE_TRANSITION_REJECTED',
    // Auth/lifecycle actions
    'user_registered',
    'org_created',
    'email_verification_sent',
    'email_verified',
    'resend_verification',
    'email_verification_bypassed',
    'password_reset_requested',
    'password_reset_completed',
    'governance_evaluate',
    'guard_allow',
    'guard_deny',
    // Migration 082
    'ACK_CONSUMED',
    'PHASE_UPDATED_WITH_ACK',
    'soft_remove_to_trash',
    'restore_from_trash',
    'retention_purge_batch',
    'permanent_delete_from_trash',
    // Migration 083
    'TEMPLATE_APPLIED',
    'TEMPLATE_APPLY_FAILED',
    'GATE_DECIDE',
    'GATE_DECIDE_BLOCKED',
    'DOC_TRANSITION',
    'DOCUMENT_TRANSITION_FAILED',
    // Migration 171
    'complexity_mode_changed',
  ];

  /** Post-this-migration allow-list: prior + new A6 action. */
  private readonly allValues = [...this.priorValues, 'plan_changed'];

  private buildActionConstraintSql(values: string[]): string {
    const quoted = values.map((v) => `'${v}'`).join(', ');
    return `ALTER TABLE audit_events ADD CONSTRAINT "${this.actionConstraintName}" CHECK (action IN (${quoted}))`;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_events
        ADD COLUMN IF NOT EXISTS action varchar(40) NOT NULL DEFAULT 'UNKNOWN'
    `);

    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraintName}"`,
    );
    await queryRunner.query(this.buildActionConstraintSql(this.allValues));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraintName}"`,
    );
    await queryRunner.query(this.buildActionConstraintSql(this.priorValues));
  }
}
