import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkResourceAllocationsTable17980204000000
  implements MigrationInterface
{
  name = 'WorkResourceAllocationsTable17980204000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create work_resource_allocations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_resource_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "allocation_percent" integer NOT NULL DEFAULT 100,
        "start_date" date,
        "end_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_work_resource_allocations" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_resource_allocations_organization_id" 
      ON "work_resource_allocations" ("organization_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_resource_allocations_workspace_id" 
      ON "work_resource_allocations" ("workspace_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_resource_allocations_project_id" 
      ON "work_resource_allocations" ("project_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_resource_allocations_ws_proj_updated" 
      ON "work_resource_allocations" ("workspace_id", "project_id", "updated_at")
    `);

    // Unique constraint: one allocation per user per project per workspace
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_work_resource_allocations_unique_user_project" 
      ON "work_resource_allocations" ("workspace_id", "project_id", "user_id")
      WHERE "deleted_at" IS NULL
    `);

    // Add foreign key constraint to projects
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "work_resource_allocations"
          ADD CONSTRAINT "FK_work_resource_allocations_project"
          FOREIGN KEY ("project_id") REFERENCES "projects"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_resource_allocations" DROP CONSTRAINT IF EXISTS "FK_work_resource_allocations_project"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_resource_allocations_unique_user_project"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_resource_allocations_ws_proj_updated"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_resource_allocations_project_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_resource_allocations_workspace_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_resource_allocations_organization_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "work_resource_allocations"`);
  }
}
