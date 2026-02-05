import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add deleted_at to work_tasks and work_phases for soft delete.
 * Delete endpoints set deletedAt; list/get exclude deleted by default.
 */
export class WorkTasksWorkPhasesSoftDelete17980202300000
  implements MigrationInterface
{
  name = 'WorkTasksWorkPhasesSoftDelete17980202300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_tasks" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_work_tasks_deleted_at" ON "work_tasks" ("deleted_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "work_phases" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_work_phases_deleted_at" ON "work_phases" ("deleted_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_work_tasks_deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "work_tasks" DROP COLUMN "deleted_at"`,
    );

    await queryRunner.query(`DROP INDEX "IDX_work_phases_deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "work_phases" DROP COLUMN "deleted_at"`,
    );
  }
}
