import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcceptanceCriteriaAndDoD17980215000000
  implements MigrationInterface
{
  name = 'AddAcceptanceCriteriaAndDoD17980215000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add acceptance_criteria jsonb to work_tasks
    const taskCols = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'work_tasks'`,
    );
    const taskExisting = new Set(taskCols.map((r: any) => r.column_name));
    if (!taskExisting.has('acceptance_criteria')) {
      await queryRunner.query(
        `ALTER TABLE "work_tasks" ADD COLUMN "acceptance_criteria" jsonb`,
      );
    }

    // 2. Add definition_of_done jsonb to projects
    const projCols = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'`,
    );
    const projExisting = new Set(projCols.map((r: any) => r.column_name));
    if (!projExisting.has('definition_of_done')) {
      await queryRunner.query(
        `ALTER TABLE "projects" ADD COLUMN "definition_of_done" jsonb`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_tasks" DROP COLUMN IF EXISTS "acceptance_criteria"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN IF EXISTS "definition_of_done"`,
    );
  }
}
