import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGovernanceEvaluateAuditAction18000000000058
  implements MigrationInterface
{
  name = 'AddGovernanceEvaluateAuditAction18000000000058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing check constraint and recreate with governance_evaluate added
    await queryRunner.query(`
      ALTER TABLE "audit_events" DROP CONSTRAINT IF EXISTS "CHK_audit_events_action"
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_events" ADD CONSTRAINT "CHK_audit_events_action"
      CHECK (action IN (
        'create', 'update', 'delete', 'activate', 'compute',
        'attach', 'detach', 'invite', 'accept', 'suspend', 'reinstate',
        'upload_complete', 'download_link', 'presign_create',
        'quota_block', 'plan_status_block', 'wip_override', 'role_change',
        'PHASE_CREATED', 'PHASE_UPDATED', 'PHASE_REORDERED', 'PHASE_RESTORED', 'PHASE_DELETED',
        'TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'TASK_RESTORED',
        'TASK_STATUS_CHANGED', 'TASK_ASSIGNED', 'TASK_MOVED',
        'SPRINT_CREATED', 'SPRINT_UPDATED', 'SPRINT_STARTED', 'SPRINT_COMPLETED',
        'CHANGE_REQUEST_CREATED', 'CHANGE_REQUEST_UPDATED', 'CHANGE_REQUEST_APPROVED', 'CHANGE_REQUEST_REJECTED',
        'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED',
        'BUDGET_UPDATED', 'BUDGET_APPROVED',
        'GATE_CREATED', 'GATE_EVALUATED', 'GATE_PASSED', 'GATE_FAILED',
        'POLICY_CREATED', 'POLICY_UPDATED', 'POLICY_DELETED',
        'TEMPLATE_ACTIVATED', 'TEMPLATE_DEACTIVATED',
        'PHASE_TRANSITION_REQUESTED', 'PHASE_TRANSITION_APPROVED', 'PHASE_TRANSITION_REJECTED',
        'user_registered', 'org_created',
        'email_verification_sent', 'email_verified', 'resend_verification',
        'email_verification_bypassed',
        'governance_evaluate'
      ))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: drop and recreate without governance_evaluate
    await queryRunner.query(`
      ALTER TABLE "audit_events" DROP CONSTRAINT IF EXISTS "CHK_audit_events_action"
    `);
  }
}
