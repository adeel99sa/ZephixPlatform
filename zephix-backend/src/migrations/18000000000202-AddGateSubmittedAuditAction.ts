import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * W2-C2 — extend audit_events CHECK constraints to accept gate submission
 * audit writes from PhaseGateEvaluatorService.transitionSubmission().
 *
 * CONSTRAINT TRAP (per constraint migration rule, locked 2026-07-08):
 *   CHK_audit_events_action is an ARRAY allowlist CHECK constraint, not a PG
 *   enum. New values require drop+recreate. The priorActionValues array below
 *   was derived from a LIVE READ of pg_constraint on staging 2026-07-09
 *   (post-migration-201 state). SELECT DISTINCT on audit_events.action
 *   confirmed all live rows are covered. Do not edit priorActionValues without
 *   re-running the live read — adding stale values is safe; OMITTING live
 *   values will violate existing rows on ADD CONSTRAINT and take staging down
 *   (the migration-197 failure mode verbatim).
 *
 * Changes:
 *   1. action:      add 'GATE_SUBMITTED'        to CHK_audit_events_action
 *   2. entity_type: add 'phase_gate_submission'  to CHK_audit_events_entity_type
 */
export class AddGateSubmittedAuditAction18000000000202
  implements MigrationInterface
{
  name = 'AddGateSubmittedAuditAction18000000000202';

  private readonly actionConstraintName = 'CHK_audit_events_action';
  private readonly entityTypeConstraintName = 'CHK_audit_events_entity_type';

  /**
   * Live-read 2026-07-09 from staging (post-migration-201).
   * Source: SELECT pg_get_constraintdef(oid) FROM pg_constraint
   *         WHERE conrelid = 'audit_events'::regclass AND conname = 'CHK_audit_events_action'
   */
  private readonly priorActionValues = [
    'create', 'update', 'delete', 'activate', 'compute', 'attach', 'detach',
    'invite', 'accept', 'suspend', 'reinstate', 'upload_complete', 'download_link',
    'presign_create', 'quota_block', 'plan_status_block', 'wip_override', 'role_change',
    'PHASE_CREATED', 'PHASE_UPDATED', 'PHASE_REORDERED', 'PHASE_RESTORED', 'PHASE_DELETED',
    'TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'TASK_RESTORED', 'TASK_STATUS_CHANGED',
    'TASK_ASSIGNED', 'TASK_MOVED',
    'SPRINT_CREATED', 'SPRINT_UPDATED', 'SPRINT_STARTED', 'SPRINT_COMPLETED',
    'CHANGE_REQUEST_CREATED', 'CHANGE_REQUEST_UPDATED', 'CHANGE_REQUEST_APPROVED', 'CHANGE_REQUEST_REJECTED',
    'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED',
    'BUDGET_UPDATED', 'BUDGET_APPROVED',
    'GATE_CREATED', 'GATE_EVALUATED', 'GATE_PASSED', 'GATE_FAILED',
    'POLICY_CREATED', 'POLICY_UPDATED', 'POLICY_DELETED',
    'TEMPLATE_ACTIVATED', 'TEMPLATE_DEACTIVATED',
    'PHASE_TRANSITION_REQUESTED', 'PHASE_TRANSITION_APPROVED', 'PHASE_TRANSITION_REJECTED',
    'user_registered', 'org_created', 'email_verification_sent', 'email_verified',
    'resend_verification', 'email_verification_bypassed',
    'password_reset_requested', 'password_reset_completed',
    'governance_evaluate', 'guard_allow', 'guard_deny',
    'ACK_CONSUMED', 'PHASE_UPDATED_WITH_ACK',
    'soft_remove_to_trash', 'restore_from_trash', 'retention_purge_batch', 'permanent_delete_from_trash',
    'TEMPLATE_APPLIED', 'TEMPLATE_APPLY_FAILED',
    'GATE_DECIDE', 'GATE_DECIDE_BLOCKED',
    'DOC_TRANSITION', 'DOCUMENT_TRANSITION_FAILED',
    'complexity_mode_changed', 'plan_changed',
  ];

  private readonly allActionValues = [...this.priorActionValues, 'GATE_SUBMITTED'];

  /**
   * Live-read 2026-07-09 from staging (post-migration-201).
   * Source: SELECT pg_get_constraintdef(oid) FROM pg_constraint
   *         WHERE conrelid = 'audit_events'::regclass AND conname = 'CHK_audit_events_entity_type'
   */
  private readonly priorEntityTypeValues = [
    'organization', 'workspace', 'project', 'portfolio', 'work_task', 'work_risk',
    'doc', 'attachment', 'scenario_plan', 'scenario_action', 'scenario_result',
    'baseline', 'capacity_calendar', 'billing_plan', 'entitlement', 'webhook', 'board_move',
    'PHASE', 'TASK', 'SPRINT', 'RISK', 'ALLOCATION', 'CHANGE_REQUEST',
    'DOCUMENT', 'BUDGET', 'GATE', 'POLICY', 'TEMPLATE', 'TEMPLATE_ACTIVATION',
    'TAILORING_PROFILE', 'user', 'email_verification', 'password_reset',
    'authorization_decision', 'TEMPLATE_LINEAGE', 'GATE_APPROVAL', 'DOCUMENT_INSTANCE',
    'project_artifact', 'project_artifact_item',
  ];

  private readonly allEntityTypeValues = [
    ...this.priorEntityTypeValues,
    'phase_gate_submission',
  ];

  private buildCheckSql(
    constraintName: string,
    column: string,
    values: string[],
  ): string {
    const quoted = values.map((v) => `'${v}'`).join(', ');
    return `ALTER TABLE audit_events ADD CONSTRAINT "${constraintName}" CHECK (${column} IN (${quoted}))`;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend action constraint
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraintName}"`,
    );
    await queryRunner.query(
      this.buildCheckSql(this.actionConstraintName, 'action', this.allActionValues),
    );

    // 2. Extend entity_type constraint
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.entityTypeConstraintName}"`,
    );
    await queryRunner.query(
      this.buildCheckSql(this.entityTypeConstraintName, 'entity_type', this.allEntityTypeValues),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraintName}"`,
    );
    await queryRunner.query(
      this.buildCheckSql(this.actionConstraintName, 'action', this.priorActionValues),
    );

    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.entityTypeConstraintName}"`,
    );
    await queryRunner.query(
      this.buildCheckSql(this.entityTypeConstraintName, 'entity_type', this.priorEntityTypeValues),
    );
  }
}
