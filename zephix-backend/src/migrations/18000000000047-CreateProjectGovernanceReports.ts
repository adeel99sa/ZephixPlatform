import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectGovernanceReports18000000000047
  implements MigrationInterface
{
  name = 'CreateProjectGovernanceReports18000000000047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_governance_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "title" character varying(240) NOT NULL,
        "reporting_period_start" date,
        "reporting_period_end" date,
        "phase" character varying(120),
        "overall_status" character varying(16) NOT NULL DEFAULT 'AMBER',
        "schedule_status" character varying(16) NOT NULL DEFAULT 'AMBER',
        "resource_status" character varying(16) NOT NULL DEFAULT 'AMBER',
        "executive_summary" text,
        "current_activities" text,
        "next_week_activities" text,
        "help_needed" text,
        "created_by_user_id" uuid NOT NULL,
        "updated_by_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_governance_reports_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_governance_reports_org"
      ON "project_governance_reports" ("organization_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_governance_reports_workspace"
      ON "project_governance_reports" ("workspace_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_governance_reports_project"
      ON "project_governance_reports" ("project_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_governance_reports_period"
      ON "project_governance_reports" ("project_id", "reporting_period_start")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "project_governance_reports"
    `);
  }
}
