import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoryTaskType18000000000187 implements MigrationInterface {
  name = 'AddStoryTaskType18000000000187';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'STORY'`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL has no DROP VALUE — this migration is irreversible by design.
    // Down is intentionally a no-op.
  }
}
