import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wave 1: Create work_task_dependencies table for the WorkTaskDependency entity.
 * This is separate from the legacy work_item_dependencies table.
 */
export class CreateWorkTaskDependenciesTable17980209000000 implements MigrationInterface {
  name = 'CreateWorkTaskDependenciesTable17980209000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: skip if table already exists (e.g. from TypeORM synchronize)
    const exists = await queryRunner.hasTable('work_task_dependencies');
    if (exists) return;

    await queryRunner.query(`
      CREATE TYPE "dependency_type_enum" AS ENUM (
        'FINISH_TO_START',
        'START_TO_START',
        'FINISH_TO_FINISH',
        'START_TO_FINISH'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "work_task_dependencies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "predecessor_task_id" uuid NOT NULL,
        "successor_task_id" uuid NOT NULL,
        "type" "dependency_type_enum" NOT NULL DEFAULT 'FINISH_TO_START',
        "created_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_task_dependencies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_work_task_dep_ws_pred_succ_type"
          UNIQUE ("workspace_id", "predecessor_task_id", "successor_task_id", "type")
      )
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX "IDX_wtd_org" ON "work_task_dependencies" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_wtd_ws" ON "work_task_dependencies" ("workspace_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_wtd_project" ON "work_task_dependencies" ("project_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_wtd_predecessor" ON "work_task_dependencies" ("predecessor_task_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_wtd_successor" ON "work_task_dependencies" ("successor_task_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_wtd_created_by" ON "work_task_dependencies" ("created_by_user_id")`);

    // Foreign keys
    await queryRunner.query(`
      ALTER TABLE "work_task_dependencies"
      ADD CONSTRAINT "FK_wtd_predecessor"
      FOREIGN KEY ("predecessor_task_id") REFERENCES "work_tasks"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "work_task_dependencies"
      ADD CONSTRAINT "FK_wtd_successor"
      FOREIGN KEY ("successor_task_id") REFERENCES "work_tasks"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "work_task_dependencies"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "dependency_type_enum"`);
  }
}
