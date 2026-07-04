import { MigrationInterface, QueryRunner } from 'typeorm';

// Corrective: migrations 187/188 targeted the orphaned `task_type` enum.
// The work_tasks.type column uses `work_tasks_type_enum` (TypeORM-generated name).
export class AddSpikeToWorkTasksTypeEnum18000000000190 implements MigrationInterface {
  name = 'AddSpikeToWorkTasksTypeEnum18000000000190';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE work_tasks_type_enum ADD VALUE IF NOT EXISTS 'SPIKE'`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL has no DROP VALUE — this migration is irreversible by design.
    // Down is intentionally a no-op.
  }
}
