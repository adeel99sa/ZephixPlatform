import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5A Step 3: Performance-critical composite indexes for benchmarked queries.
 *
 * Addresses three bottlenecks identified by EXPLAIN ANALYZE:
 *   1. audit_events: org+created_at for admin audit viewer (87ms → <1ms target)
 *   2. work_tasks: project+status+rank for board column queries (1.2ms → <0.5ms target)
 *   3. work_task_dependencies: org+project for Gantt view (2ms → <0.5ms target)
 *
 * All DDL is idempotent (IF NOT EXISTS).
 */
export class BenchmarkPerformanceIndexes17980270000000 implements MigrationInterface {
  name = 'BenchmarkPerformanceIndexes17980270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Audit: admin audit viewer — ORDER BY created_at DESC
    // Note: idx_audit_events_org_time uses occurred_at, not created_at.
    // The audit controller and API sort by created_at, so this index is required.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_audit_events_org_created_desc"
       ON "audit_events" ("organization_id", "created_at" DESC)`,
    );

    // 2. Board column: WHERE project_id AND status ORDER BY rank
    // Partial index excludes soft-deleted tasks.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_work_tasks_board_column"
       ON "work_tasks" ("project_id", "status", "rank")
       WHERE "deleted_at" IS NULL`,
    );

    // 3. Dependencies by project: Gantt view loads all deps for a project
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_work_task_deps_org_project"
       ON "work_task_dependencies" ("organization_id", "project_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_audit_events_org_created_desc"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_work_tasks_board_column"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_work_task_deps_org_project"`,
    );
  }
}
