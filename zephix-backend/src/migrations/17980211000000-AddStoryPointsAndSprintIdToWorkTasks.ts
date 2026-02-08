import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoryPointsAndSprintIdToWorkTasks17980211000000
  implements MigrationInterface
{
  name = 'AddStoryPointsAndSprintIdToWorkTasks17980211000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add story_points column if not exists
    const hasSP = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'work_tasks' AND column_name = 'story_points'`,
    );
    if (hasSP.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "work_tasks" ADD COLUMN "story_points" integer`,
      );
    }

    // Add sprint_id column if not exists
    const hasSprint = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'work_tasks' AND column_name = 'sprint_id'`,
    );
    if (hasSprint.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "work_tasks" ADD COLUMN "sprint_id" uuid`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_work_tasks_sprint_id" ON "work_tasks" ("sprint_id") WHERE "sprint_id" IS NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_tasks_sprint_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_tasks" DROP COLUMN IF EXISTS "sprint_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_tasks" DROP COLUMN IF EXISTS "story_points"`,
    );
  }
}
