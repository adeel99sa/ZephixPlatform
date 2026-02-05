import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkRisksTable17980203000000 implements MigrationInterface {
  name = 'WorkRisksTable17980203000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."work_risks_severity_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."work_risks_status_enum" AS ENUM('OPEN', 'MITIGATED', 'ACCEPTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create work_risks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_risks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "title" character varying(300) NOT NULL,
        "description" text,
        "severity" "public"."work_risks_severity_enum" NOT NULL DEFAULT 'MEDIUM',
        "status" "public"."work_risks_status_enum" NOT NULL DEFAULT 'OPEN',
        "owner_user_id" uuid,
        "due_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_work_risks" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_risks_organization_id" ON "work_risks" ("organization_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_risks_workspace_id" ON "work_risks" ("workspace_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_risks_project_id" ON "work_risks" ("project_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_risks_ws_proj_updated" ON "work_risks" ("workspace_id", "project_id", "updated_at")
    `);

    // Add foreign key constraint to projects
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "work_risks"
          ADD CONSTRAINT "FK_work_risks_project"
          FOREIGN KEY ("project_id") REFERENCES "projects"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_risks" DROP CONSTRAINT IF EXISTS "FK_work_risks_project"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_risks_ws_proj_updated"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_risks_project_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_risks_workspace_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_risks_organization_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "work_risks"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."work_risks_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."work_risks_severity_enum"`,
    );
  }
}
