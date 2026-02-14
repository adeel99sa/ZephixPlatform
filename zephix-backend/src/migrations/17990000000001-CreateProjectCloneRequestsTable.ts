import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectCloneRequestsTable17990000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Use uuid_generate_v4 which is available via uuid-ossp (already enabled in InitCoreSchema)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_clone_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "source_project_id" uuid NOT NULL,
        "target_workspace_id" uuid NOT NULL,
        "mode" varchar(30) NOT NULL,
        "requested_by" uuid NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'in_progress',
        "new_project_id" uuid NULL,
        "failure_reason" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz NULL
      );
    `);

    // Idempotency gate: only one in_progress request per (source, target, mode, user)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_clone_requests_idempotency"
        ON "project_clone_requests"("source_project_id", "target_workspace_id", "mode", "requested_by")
        WHERE "status" = 'in_progress';
    `);

    // Lookup by source project
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clone_requests_source"
        ON "project_clone_requests"("source_project_id");
    `);

    // Lookup by status for cleanup jobs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clone_requests_status"
        ON "project_clone_requests"("status");
    `);

    // Lookup path for completed request on retry
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clone_requests_lookup"
        ON "project_clone_requests"("source_project_id", "target_workspace_id", "mode", "requested_by", "created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_clone_requests_lookup"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_clone_requests_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_clone_requests_source"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_clone_requests_idempotency"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "project_clone_requests"`,
    );
  }
}
