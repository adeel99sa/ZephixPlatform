import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSprintsTable17980212000000 implements MigrationInterface {
  name = 'CreateSprintsTable17980212000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('sprints');
    if (exists) return;

    // Create enum if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sprint_status_enum" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE "sprints" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "goal" text,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" "sprint_status_enum" NOT NULL DEFAULT 'PLANNING',
        "created_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sprints" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_sprints_organization_id" ON "sprints" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sprints_workspace_id" ON "sprints" ("workspace_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sprints_project_id" ON "sprints" ("project_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sprints_project_id_status" ON "sprints" ("project_id", "status")`,
    );

    // Add FK from work_tasks.sprint_id -> sprints.id (if column already exists)
    const hasSprintCol = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'work_tasks' AND column_name = 'sprint_id'`,
    );
    if (hasSprintCol.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "work_tasks"
        ADD CONSTRAINT "FK_work_tasks_sprint_id"
        FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id")
        ON DELETE SET NULL
      `).catch(() => {
        // FK might already exist
      });
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_tasks" DROP CONSTRAINT IF EXISTS "FK_work_tasks_sprint_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "sprints"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sprint_status_enum"`);
  }
}
