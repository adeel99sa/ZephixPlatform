import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectWorkflowConfigWip17980214000000
  implements MigrationInterface
{
  name = 'AddProjectWorkflowConfigWip17980214000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(
      `SELECT to_regclass('public.project_workflow_configs') IS NOT NULL AS exists`,
    );
    if (tableExists[0]?.exists) return;

    await queryRunner.query(`
      CREATE TABLE "project_workflow_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "default_wip_limit" integer,
        "status_wip_limits" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_workflow_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_project_workflow_configs_project" UNIQUE ("project_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_pwc_org" ON "project_workflow_configs" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pwc_ws" ON "project_workflow_configs" ("workspace_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pwc_org_ws_proj" ON "project_workflow_configs" ("organization_id", "workspace_id", "project_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "project_workflow_configs"`,
    );
  }
}
