import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SEC-4 — reconcile the audit_events CHECK↔enum drift (add-only).
 *
 * Two AuditAction/AuditEntityType enum values were live but ABSENT from the
 * CHECK, so every write was rejected and swallowed by AuditService.record()'s
 * catch (silent receipt loss):
 *   - action 'password_reset_link_generated' (AUTH-1, PR #391, since 2026-07-12)
 *   - entity_type 'template' (TC-B6 template-catalog mutations; CHECK had only
 *     uppercase 'TEMPLATE')
 * Lost-row counts are unknowable by construction — stated honestly in the
 * posture doc, not reconstructed here.
 *
 * Also adds one NEW action for SEC-4 ruling 4 (fail-honest AuditService):
 *   - action 'AUDIT_WRITE_RECOVERED' — the gap receipt written when audit
 *     writes resume after a swallowed-failure run.
 * Net: action CHECK 83 → 85 (+2), entity_type CHECK 41 → 42 (+1). Adds only.
 *
 * CONSTRAINT TRAP (per constraint migration rule, locked 2026-07-08):
 *   ARRAY-allowlist CHECKs → drop+recreate. priorActionValues/priorEntityValues
 *   are a LIVE READ of pg_constraint on staging 2026-07-17 (host 10.250.17.120,
 *   post-213): action 83, entity_type 41. Adds only, removes none → no existing
 *   row can be violated. Do not edit without re-reading live.
 *
 * The schema-parity CI gate (verify-audit-enum-parity) makes this drift class
 * a red board forever: every AuditAction/AuditEntityType enum value must be in
 * the live CHECK (direction A), so a future enum add without a matching
 * migration fails the board instead of silently swallowing writes.
 */
export class ReconcileAuditActionEntityDrift18000000000214
  implements MigrationInterface
{
  name = 'ReconcileAuditActionEntityDrift18000000000214';

  private readonly actionConstraint = 'CHK_audit_events_action';
  private readonly entityConstraint = 'CHK_audit_events_entity_type';

  // Live read 2026-07-17 (staging, post-213). 83 values.
  private readonly priorActions = [
    'create', 'update', 'delete', 'activate', 'compute', 'attach',
    'detach', 'invite', 'accept', 'suspend', 'reinstate', 'upload_complete',
    'download_link', 'presign_create', 'quota_block', 'plan_status_block', 'wip_override', 'role_change',
    'PHASE_CREATED', 'PHASE_UPDATED', 'PHASE_REORDERED', 'PHASE_RESTORED', 'PHASE_DELETED', 'TASK_CREATED',
    'TASK_UPDATED', 'TASK_DELETED', 'TASK_RESTORED', 'TASK_STATUS_CHANGED', 'TASK_ASSIGNED', 'TASK_MOVED',
    'SPRINT_CREATED', 'SPRINT_UPDATED', 'SPRINT_STARTED', 'SPRINT_COMPLETED', 'CHANGE_REQUEST_CREATED', 'CHANGE_REQUEST_UPDATED',
    'CHANGE_REQUEST_APPROVED', 'CHANGE_REQUEST_REJECTED', 'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'BUDGET_UPDATED',
    'BUDGET_APPROVED', 'GATE_CREATED', 'GATE_EVALUATED', 'GATE_PASSED', 'GATE_FAILED', 'POLICY_CREATED',
    'POLICY_UPDATED', 'POLICY_DELETED', 'TEMPLATE_ACTIVATED', 'TEMPLATE_DEACTIVATED', 'PHASE_TRANSITION_REQUESTED', 'PHASE_TRANSITION_APPROVED',
    'PHASE_TRANSITION_REJECTED', 'user_registered', 'org_created', 'email_verification_sent', 'email_verified', 'resend_verification',
    'email_verification_bypassed', 'password_reset_requested', 'password_reset_completed', 'governance_evaluate', 'guard_allow', 'guard_deny',
    'ACK_CONSUMED', 'PHASE_UPDATED_WITH_ACK', 'soft_remove_to_trash', 'restore_from_trash', 'retention_purge_batch', 'permanent_delete_from_trash',
    'TEMPLATE_APPLIED', 'TEMPLATE_APPLY_FAILED', 'GATE_DECIDE', 'GATE_DECIDE_BLOCKED', 'DOC_TRANSITION', 'DOCUMENT_TRANSITION_FAILED',
    'complexity_mode_changed', 'plan_changed', 'GATE_SUBMITTED', 'AUTH_RATE_LIMIT_DEGRADED', 'AUTH_RATE_LIMIT_RECOVERED',
  ];
  private readonly allActions = [
    ...this.priorActions,
    'password_reset_link_generated', // SEC-4: swallowed since AUTH-1 (2026-07-12)
    'AUDIT_WRITE_RECOVERED', // SEC-4 ruling 4: fail-honest gap receipt on recovery
  ];

  // Live read 2026-07-17 (staging, post-213). 41 values.
  private readonly priorEntities = [
    'organization', 'workspace', 'project', 'portfolio', 'work_task', 'work_risk',
    'doc', 'attachment', 'scenario_plan', 'scenario_action', 'scenario_result', 'baseline',
    'capacity_calendar', 'billing_plan', 'entitlement', 'webhook', 'board_move', 'PHASE',
    'TASK', 'SPRINT', 'RISK', 'ALLOCATION', 'CHANGE_REQUEST', 'DOCUMENT',
    'BUDGET', 'GATE', 'POLICY', 'TEMPLATE', 'TEMPLATE_ACTIVATION', 'TAILORING_PROFILE',
    'user', 'email_verification', 'password_reset', 'authorization_decision', 'TEMPLATE_LINEAGE', 'GATE_APPROVAL',
    'DOCUMENT_INSTANCE', 'project_artifact', 'project_artifact_item', 'phase_gate_submission', 'security',
  ];
  private readonly allEntities = [...this.priorEntities, 'template'];

  private check(name: string, col: string, vals: string[]): string {
    return `ALTER TABLE audit_events ADD CONSTRAINT "${name}" CHECK (${col} IN (${vals
      .map((v) => `'${v}'`)
      .join(', ')}))`;
  }

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraint}"`);
    await q.query(this.check(this.actionConstraint, 'action', this.allActions));
    await q.query(`ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.entityConstraint}"`);
    await q.query(this.check(this.entityConstraint, 'entity_type', this.allEntities));
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.actionConstraint}"`);
    await q.query(this.check(this.actionConstraint, 'action', this.priorActions));
    await q.query(`ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.entityConstraint}"`);
    await q.query(this.check(this.entityConstraint, 'entity_type', this.priorEntities));
  }
}
