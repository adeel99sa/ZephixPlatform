import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Engine 4 Phase B prerequisite — TC audit consolidation.
 *
 * Extends CHK_audit_events_action to include 6 new action values used by
 * Template Center workflows that were previously written via the broken
 * TemplateCenterAuditService.emit() (silently failed at multiple levels —
 * field-name drift + missing required fields + this CHECK constraint).
 *
 * After consolidation, these action values flow through AuditService.record()
 * which is the canonical platform audit write path.
 *
 * New values added:
 * - TEMPLATE_APPLIED, TEMPLATE_APPLY_FAILED (template-apply.service.ts)
 * - GATE_DECIDE, GATE_DECIDE_BLOCKED (gate-approvals.service.ts)
 * - DOC_TRANSITION, DOCUMENT_TRANSITION_FAILED (document-lifecycle.service.ts)
 *
 * Pattern follows migration 082 (PR #244): drop + recreate constraint with
 * full prior allow-list preserved + 6 new TC values appended.
 */
export class ExpandAuditEventsActionConstraintForTemplateCenter1800000000083
  implements MigrationInterface
{
  name = 'ExpandAuditEventsActionConstraintForTemplateCenter1800000000083';

  private readonly actionConstraintName = 'CHK_audit_events_action';
  private readonly entityTypeConstraintName = 'CHK_audit_events_entity_type';

  /**
   * Full entity_type allow-list: prior values + 3 new TC entity types.
   * Prior values copied verbatim from staging `pg_get_constraintdef` output
   * captured during Phase 0 reconnaissance on 2026-05-04.
   */
  private readonly allEntityTypes = [
    // Lowercase entity types (Phase 3B)
    'organization',
    'workspace',
    'project',
    'portfolio',
    'work_task',
    'work_risk',
    'doc',
    'attachment',
    'scenario_plan',
    'scenario_action',
    'scenario_result',
    'baseline',
    'capacity_calendar',
    'billing_plan',
    'entitlement',
    'webhook',
    'board_move',
    // UPPERCASE entity types (work-management module)
    'PHASE',
    'TASK',
    'SPRINT',
    'RISK',
    'ALLOCATION',
    'CHANGE_REQUEST',
    'DOCUMENT',
    'BUDGET',
    'GATE',
    'POLICY',
    'TEMPLATE',
    'TEMPLATE_ACTIVATION',
    'TAILORING_PROFILE',
    // Auth/lifecycle entity types
    'user',
    'email_verification',
    'password_reset',
    'authorization_decision',
    // === NEW: 3 Template Center entity types added by this migration ===
    'TEMPLATE_LINEAGE',
    'GATE_APPROVAL',
    'DOCUMENT_INSTANCE',
  ];

  private readonly priorEntityTypes = this.allEntityTypes.filter(
    (v) =>
      !['TEMPLATE_LINEAGE', 'GATE_APPROVAL', 'DOCUMENT_INSTANCE'].includes(v),
  );

  /**
   * Full allow-list: prior values from migration 082 + 6 new TC values.
   * Prior values copied verbatim from staging `pg_get_constraintdef` output
   * captured during Phase 0 reconnaissance on 2026-05-04.
   */
  private readonly allValues = [
    // Phase 3B lowercase actions (from AuditAction enum, original)
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
    // UPPERCASE work-management actions (from migration 008/010)
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
    // Migration 082 (PR #244) additions
    'ACK_CONSUMED',
    'PHASE_UPDATED_WITH_ACK',
    'soft_remove_to_trash',
    'restore_from_trash',
    'retention_purge_batch',
    'permanent_delete_from_trash',
    // === NEW: 6 Template Center values added by this migration ===
    'TEMPLATE_APPLIED',
    'TEMPLATE_APPLY_FAILED',
    'GATE_DECIDE',
    'GATE_DECIDE_BLOCKED',
    'DOC_TRANSITION',
    'DOCUMENT_TRANSITION_FAILED',
  ];

  /**
   * Prior values only (post-082, pre-083) for revert.
   */
  private readonly priorValues = this.allValues.filter(
    (v) =>
      ![
        'TEMPLATE_APPLIED',
        'TEMPLATE_APPLY_FAILED',
        'GATE_DECIDE',
        'GATE_DECIDE_BLOCKED',
        'DOC_TRANSITION',
        'DOCUMENT_TRANSITION_FAILED',
      ].includes(v),
  );

  private buildActionConstraintSql(values: string[]): string {
    const quoted = values.map((v) => `'${v}'`).join(', ');
    return `ALTER TABLE audit_events ADD CONSTRAINT "${this.actionConstraintName}" CHECK (action IN (${quoted}))`;
  }

  private buildEntityTypeConstraintSql(values: string[]): string {
    const quoted = values.map((v) => `'${v}'`).join(', ');
    return `ALTER TABLE audit_events ADD CONSTRAINT "${this.entityTypeConstraintName}" CHECK (entity_type IN (${quoted}))`;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Defensive: ensure `action` column exists before constraint manipulation.
    // CI environments may have stale DB state where the column is missing.
    // Same pattern as migration 082 (PR #244).
    await queryRunner.query(`
      ALTER TABLE audit_events
        ADD COLUMN IF NOT EXISTS action varchar(40) NOT NULL DEFAULT 'UNKNOWN'
    `);

    // Expand action CHECK constraint
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraintName}"`,
    );
    await queryRunner.query(this.buildActionConstraintSql(this.allValues));

    // Expand entity_type CHECK constraint
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.entityTypeConstraintName}"`,
    );
    await queryRunner.query(
      this.buildEntityTypeConstraintSql(this.allEntityTypes),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert entity_type constraint first
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.entityTypeConstraintName}"`,
    );
    await queryRunner.query(
      this.buildEntityTypeConstraintSql(this.priorEntityTypes),
    );

    // Revert action constraint
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraintName}"`,
    );
    await queryRunner.query(this.buildActionConstraintSql(this.priorValues));
  }
}
