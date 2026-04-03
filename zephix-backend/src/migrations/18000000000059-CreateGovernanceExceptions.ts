import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGovernanceExceptions18000000000059
  implements MigrationInterface
{
  name = 'CreateGovernanceExceptions18000000000059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "governance_exceptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "project_id" uuid,
        "exception_type" varchar(50) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "reason" text NOT NULL,
        "requested_by_user_id" uuid NOT NULL,
        "resolved_by_user_id" uuid,
        "resolution_note" text,
        "audit_event_id" uuid,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_governance_exceptions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_govex_org_status"
      ON "governance_exceptions" ("organization_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_govex_org_workspace"
      ON "governance_exceptions" ("organization_id", "workspace_id")
    `);

    // Add EXCEPTION_RESOLUTION to the audit CHECK constraint
    // Also add email_verification_bypassed if not already present
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
    await queryRunner.query(`DROP TABLE IF EXISTS "governance_exceptions"`);
  }
}
