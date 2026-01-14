import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 8: Create materialized metrics tables for analytics engine
 */
export class CreatePhase8AnalyticsTables1766000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Materialized project metrics table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "materialized_project_metrics" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL,
        "health" varchar(20) NOT NULL DEFAULT 'green',
        "schedule_variance" numeric(10, 2) DEFAULT 0,
        "cost_variance" numeric(10, 2) DEFAULT 0,
        "risk_exposure" numeric(10, 2) DEFAULT 0,
        "overdue_count" integer DEFAULT 0,
        "tasks_due_this_week" integer DEFAULT 0,
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_project_metrics_project" FOREIGN KEY ("project_id")
          REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_metrics_project_id"
      ON "materialized_project_metrics"("project_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_metrics_health"
      ON "materialized_project_metrics"("health")
    `);

    // Materialized resource metrics table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "materialized_resource_metrics" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "capacity_hours" numeric(10, 2) DEFAULT 0,
        "assigned_hours" numeric(10, 2) DEFAULT 0,
        "overload_flag" boolean DEFAULT false,
        "upcoming_load" numeric(10, 2) DEFAULT 0,
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_resource_metrics_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_resource_metrics_org" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_resource_metrics_user_id"
      ON "materialized_resource_metrics"("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_resource_metrics_org_id"
      ON "materialized_resource_metrics"("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_resource_metrics_overload"
      ON "materialized_resource_metrics"("overload_flag")
    `);

    // Materialized portfolio metrics table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "materialized_portfolio_metrics" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL UNIQUE,
        "green_projects" integer DEFAULT 0,
        "yellow_projects" integer DEFAULT 0,
        "red_projects" integer DEFAULT 0,
        "total_risk_exposure" numeric(10, 2) DEFAULT 0,
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_portfolio_metrics_org" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_portfolio_metrics_org_id"
      ON "materialized_portfolio_metrics"("organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "materialized_portfolio_metrics"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "materialized_resource_metrics"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "materialized_project_metrics"`,
    );
  }
}
