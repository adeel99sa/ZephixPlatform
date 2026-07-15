import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CI-RED-1 R1 — the missing hot-path index.
 *
 * `idx_projects_org_created_at` on projects(organization_id, created_at DESC)
 * backs "Project list by org" — the single most-run query in a multi-tenant PM
 * platform (every project list, dashboard, workspace load). The bench/strict-
 * schema harness required it, but NO migration created it and staging/prod
 * lacked it too — a table scan on the hottest path, invisible for 40 days
 * because Schema Parity was red-and-ignored.
 *
 * Live-read 2026-07-14: projects = 194 rows on staging → a plain CREATE INDEX's
 * momentary lock is negligible now. CONCURRENTLY is NOT used: the migration
 * runner wraps each migration in a transaction (migrationsTransactionMode:
 * 'each'), and CREATE INDEX CONCURRENTLY cannot run inside a transaction. If the
 * table ever grows large, rebuild CONCURRENTLY as an ops step. Additive,
 * IF NOT EXISTS (idempotent), no DROP.
 */
export class AddProjectsOrgCreatedAtIndex18000000000209
  implements MigrationInterface
{
  name = 'AddProjectsOrgCreatedAtIndex18000000000209';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_projects_org_created_at"
        ON "projects" ("organization_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_org_created_at"`);
  }
}
