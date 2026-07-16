import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SEC-3 — extend audit_events CHECK constraints so the per-account auth rate
 * limiter (RedisAuthRateLimitStore) can write fail-open-loud degradation
 * receipts (Ruling A part 3).
 *
 * CONSTRAINT TRAP (per constraint migration rule, locked 2026-07-08):
 *   CHK_audit_events_action / CHK_audit_events_entity_type are ARRAY allowlist
 *   CHECKs, not PG enums. New values require drop+recreate. The prior* arrays
 *   below are a LIVE READ of pg_constraint on staging 2026-07-16 (post-212),
 *   NOT a copy of the stale -202 array (which predates GATE_SUBMITTED landing
 *   and omits later values). SELECT DISTINCT on live rows is a subset of these.
 *   OMITTING a live value would violate existing rows on ADD CONSTRAINT and
 *   take staging down — do not edit without re-running the live read.
 *
 * Changes:
 *   1. action:      + 'AUTH_RATE_LIMIT_DEGRADED', 'AUTH_RATE_LIMIT_RECOVERED'
 *   2. entity_type: + 'security'
 *
 * Note (out of SEC-3 scope, flagged for follow-up): the live action CHECK does
 * NOT contain 'password_reset_link_generated' (AUTH-1) or 'task_reopened'
 * (migration -197) even though both exist in the AuditAction TS enum — their
 * audit writes currently fail the CHECK and are swallowed by AuditService.
 * This migration preserves the live array as-is (adds only, removes none), so
 * it neither fixes nor regresses that; a dedicated reconciliation is warranted.
 */
export class AddAuthRateLimitAuditActions18000000000213
  implements MigrationInterface
{
  name = 'AddAuthRateLimitAuditActions18000000000213';

  private readonly actionConstraintName = 'CHK_audit_events_action';
  private readonly entityTypeConstraintName = 'CHK_audit_events_entity_type';

  /**
   * Live-read 2026-07-16 from staging (post-migration-212).
   * Source: SELECT pg_get_constraintdef(oid) FROM pg_constraint
   *   WHERE conrelid = 'audit_events'::regclass AND conname = 'CHK_audit_events_action'
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
    'complexity_mode_changed', 'plan_changed', 'GATE_SUBMITTED',
  ];

  private readonly allActionValues = [
    ...this.priorActionValues,
    'AUTH_RATE_LIMIT_DEGRADED',
    'AUTH_RATE_LIMIT_RECOVERED',
  ];

  /**
   * Live-read 2026-07-16 from staging (post-migration-212).
   * Source: SELECT pg_get_constraintdef(oid) FROM pg_constraint
   *   WHERE conrelid = 'audit_events'::regclass AND conname = 'CHK_audit_events_entity_type'
   */
  private readonly priorEntityTypeValues = [
    'organization', 'workspace', 'project', 'portfolio', 'work_task', 'work_risk',
    'doc', 'attachment', 'scenario_plan', 'scenario_action', 'scenario_result',
    'baseline', 'capacity_calendar', 'billing_plan', 'entitlement', 'webhook', 'board_move',
    'PHASE', 'TASK', 'SPRINT', 'RISK', 'ALLOCATION', 'CHANGE_REQUEST',
    'DOCUMENT', 'BUDGET', 'GATE', 'POLICY', 'TEMPLATE', 'TEMPLATE_ACTIVATION',
    'TAILORING_PROFILE', 'user', 'email_verification', 'password_reset',
    'authorization_decision', 'TEMPLATE_LINEAGE', 'GATE_APPROVAL', 'DOCUMENT_INSTANCE',
    'project_artifact', 'project_artifact_item', 'phase_gate_submission',
  ];

  private readonly allEntityTypeValues = [
    ...this.priorEntityTypeValues,
    'security',
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
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraintName}"`,
    );
    await queryRunner.query(
      this.buildCheckSql(this.actionConstraintName, 'action', this.allActionValues),
    );

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
