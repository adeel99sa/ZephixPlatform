import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSprintFrozenPoints17980213000000 implements MigrationInterface {
  name = 'AddSprintFrozenPoints17980213000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cols = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'sprints'`,
    );
    const existing = new Set(cols.map((r: any) => r.column_name));

    if (!existing.has('committed_points')) {
      await queryRunner.query(
        `ALTER TABLE "sprints" ADD COLUMN "committed_points" integer`,
      );
    }
    if (!existing.has('completed_points')) {
      await queryRunner.query(
        `ALTER TABLE "sprints" ADD COLUMN "completed_points" integer`,
      );
    }
    if (!existing.has('completed_at')) {
      await queryRunner.query(
        `ALTER TABLE "sprints" ADD COLUMN "completed_at" TIMESTAMP`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sprints" DROP COLUMN IF EXISTS "committed_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sprints" DROP COLUMN IF EXISTS "completed_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sprints" DROP COLUMN IF EXISTS "completed_at"`,
    );
  }
}
