import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpikeTaskType18000000000188 implements MigrationInterface {
  name = 'AddSpikeTaskType18000000000188';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'SPIKE'`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL has no DROP VALUE — this migration is irreversible by design.
    // Down is intentionally a no-op.
  }
}
