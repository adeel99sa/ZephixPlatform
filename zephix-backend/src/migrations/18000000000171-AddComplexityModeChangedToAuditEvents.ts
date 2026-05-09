import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B2 PR1 — extend `audit_events.action` CHECK constraint to allow
 * `complexity_mode_changed` (ADR-B2-004).
 *
 * `WorkspacesService.setComplexityMode` emits this audit action whenever a
 * workspace's tier is mutated. The dispatch originally scheduled this CHECK
 * extension for PR2; the PR1 review verdict (Q1) moved it forward to
 * eliminate the "audit silently swallowed" debuggability hazard so that
 * when PR2 wires the controller, audit emission works on first deploy.
 *
 * Pattern follows migration 083 (Template Center action expansion):
 *   - drop + recreate constraint with full prior allow-list preserved + new
 *     value appended;
 *   - separate constraints for `action` and `entity_type` so we don't
 *     accidentally narrow the entity_type allow-list.
 *
 * Risk: zero. Constraint expansion is purely additive. Existing rows are
 * unaffected. Reverse migration restores the prior `action` allow-list
 * (post-083 baseline).
 */
export class AddComplexityModeChangedToAuditEvents18000000000171
  implements MigrationInterface
{
  name = 'AddComplexityModeChangedToAuditEvents18000000000171';

  private readonly actionConstraintName = 'CHK_audit_events_action';

  /**
   * Prior `action` allow-list (post-083 baseline). Must remain byte-identical
   * to migration 083's `allValues` minus drift, so this constraint expands
   * the same baseline rather than shrinking unrelated values.
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
  ];

  /** Post-this-migration allow-list: prior + new B2 action. */
  private readonly allValues = [
    ...this.priorValues,
    // === NEW: B2 PR1 (ADR-B2-004) ===
    'complexity_mode_changed',
  ];

  private buildActionConstraintSql(values: string[]): string {
    const quoted = values.map((v) => `'${v}'`).join(', ');
    return `ALTER TABLE audit_events ADD CONSTRAINT "${this.actionConstraintName}" CHECK (action IN (${quoted}))`;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Defensive: ensure `action` column exists. Same pattern as 082, 083.
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
    // Restore the prior allow-list. If any rows in audit_events have
    // action='complexity_mode_changed' at revert time, this DROP+CREATE
    // will fail; the standard recovery is to delete those rows first
    // (B2 PR1 ships dormant so production should have zero such rows).
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraintName}"`,
    );
    await queryRunner.query(this.buildActionConstraintSql(this.priorValues));
  }
}
