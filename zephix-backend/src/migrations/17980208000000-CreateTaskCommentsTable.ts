import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wave 1: Create task_comments table for the TaskComment entity.
 * This is separate from the legacy work_item_comments table.
 */
export class CreateTaskCommentsTable17980208000000 implements MigrationInterface {
  name = 'CreateTaskCommentsTable17980208000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: skip if table already exists (e.g. from TypeORM synchronize)
    const exists = await queryRunner.hasTable('task_comments');
    if (exists) return;

    await queryRunner.query(`
      CREATE TABLE "task_comments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "task_id" uuid NOT NULL,
        "body" text NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "updated_by_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_comments" PRIMARY KEY ("id")
      )
    `);

    // Indexes for tenancy and query patterns
    await queryRunner.query(`CREATE INDEX "IDX_task_comments_org" ON "task_comments" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_task_comments_ws" ON "task_comments" ("workspace_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_task_comments_task" ON "task_comments" ("task_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_task_comments_created_by" ON "task_comments" ("created_by_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_task_comments_updated_by" ON "task_comments" ("updated_by_user_id")`);

    // Foreign keys
    await queryRunner.query(`
      ALTER TABLE "task_comments"
      ADD CONSTRAINT "FK_task_comments_task"
      FOREIGN KEY ("task_id") REFERENCES "work_tasks"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "task_comments"
      ADD CONSTRAINT "FK_task_comments_created_by"
      FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "task_comments"`);
  }
}
