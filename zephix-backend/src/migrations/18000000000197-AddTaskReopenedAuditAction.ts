import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WM-A2a: Add TASK_REOPENED to the task_activities_type_enum PostgreSQL enum.
 *
 * activityService.record() writes type=TASK_REOPENED to task_activities when a
 * task transitions out of a terminal bucket (done/cancelled) back to open.
 * task_activities.type is a PG enum — without this ADD VALUE the INSERT throws
 * "invalid input value for enum task_activities_type_enum".
 *
 * The audit_events CHECK constraint approach was removed: TASK_REOPENED never
 * flows to audit_events.action (the audit write uses AuditAction.UPDATE='update').
 * The drop+recreate pattern is fragile because every migration since 083 that
 * added new action values must be tracked manually; omitting any causes the
 * ADD CONSTRAINT to violate existing rows (Sprint-5.1-class bug).
 *
 * down(): ALTER TYPE ... DROP VALUE is not supported in PostgreSQL. The enum
 * value remains as a harmless orphan. This is accepted debt (noted in gate report).
 */
export class AddTaskReopenedAuditAction18000000000197
  implements MigrationInterface
{
  name = 'AddTaskReopenedAuditAction18000000000197';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE task_activities_type_enum ADD VALUE IF NOT EXISTS 'TASK_REOPENED'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support ALTER TYPE ... DROP VALUE.
    // TASK_REOPENED remains in the enum as a harmless orphan after rollback.
  }
}
