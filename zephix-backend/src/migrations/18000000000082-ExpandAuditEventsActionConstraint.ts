import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Expands the CHK_audit_events_action CHECK constraint to include 6 action
 * values that production code writes but the constraint previously rejected:
 *
 * - ACK_CONSUMED, PHASE_UPDATED_WITH_ACK (work-phases ack flow)
 * - soft_remove_to_trash, restore_from_trash (project soft delete/restore)
 * - retention_purge_batch (scheduled retention purge)
 * - permanent_delete_from_trash (permanent project delete)
 *
 * Without these values, the CHECK constraint silently caused:
 * - Transaction rollback for ack workflows (user-visible failures)
 * - Swallowed audit write errors for trash/purge (silent audit data loss)
 */
export class ExpandAuditEventsActionConstraint1800000000082
  implements MigrationInterface
{
  private readonly constraintName = 'CHK_audit_events_action';

  /**
   * Full allow-list: original values + 6 new values.
   * Original values preserved exactly as they were.
   */
  private readonly allValues = [
    // Original lowercase actions (from AuditAction enum, Phase 3B)
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
    // Original UPPERCASE actions (work-management module)
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
    // Original auth/lifecycle actions
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
    // === NEW: 6 values added by this migration ===
    'ACK_CONSUMED',
    'PHASE_UPDATED_WITH_ACK',
    'soft_remove_to_trash',
    'restore_from_trash',
    'retention_purge_batch',
    'permanent_delete_from_trash',
  ];

  /**
   * Original values only (for revert).
   */
  private readonly originalValues = this.allValues.filter(
    (v) =>
      ![
        'ACK_CONSUMED',
        'PHASE_UPDATED_WITH_ACK',
        'soft_remove_to_trash',
        'restore_from_trash',
        'retention_purge_batch',
        'permanent_delete_from_trash',
      ].includes(v),
  );

  private buildConstraintSql(values: string[]): string {
    const quoted = values.map((v) => `'${v}'`).join(', ');
    return `ALTER TABLE audit_events ADD CONSTRAINT "${this.constraintName}" CHECK (action IN (${quoted}))`;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Defensive: ensure `action` column exists before adding constraint.
    // Earlier migrations (18000000000008, 17980242000000) should have added it,
    // but CI environments may have stale DB state where the column is missing.
    await queryRunner.query(`
      ALTER TABLE audit_events
        ADD COLUMN IF NOT EXISTS action varchar(40) NOT NULL DEFAULT 'UNKNOWN'
    `);

    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.constraintName}"`,
    );
    await queryRunner.query(this.buildConstraintSql(this.allValues));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.constraintName}"`,
    );
    await queryRunner.query(this.buildConstraintSql(this.originalValues));
  }
}
