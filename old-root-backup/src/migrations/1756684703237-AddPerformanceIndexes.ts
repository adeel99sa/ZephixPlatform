import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1756684703237 implements MigrationInterface {
    name = 'AddPerformanceIndexes1756684703237'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add performance indexes for common query patterns
        
        // 1. Index for resource allocations by organization, resource, and dates
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_allocations_org_resource_dates" 
            ON "resource_allocations"("organization_id", "resourceId", "startDate", "endDate")
        `);
        
        // 2. Index for resource allocations by project and dates
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_allocations_project_dates"
            ON "resource_allocations"("projectId", "startDate", "endDate")
        `);
        
        // 3. Index for projects by organization and status
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_org_status"
            ON "projects"("organization_id", "status")
        `);
        
        // 4. Index for users by organization
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_organization"
            ON "users"("organization_id")
        `);
        
        // 5. Index for work items by project and status
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_work_items_project_status"
            ON "work_items"("project_id", "status")
        `);
        
        // 6. Index for risk assessments by project and severity
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_risk_assessments_project_severity"
            ON "risk_assessments"("project_id", "severity")
        `);
        
        // 7. Composite index for portfolio management
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_portfolios_org_status"
            ON "portfolios"("organization_id", "status")
        `);
        
        // 8. Index for program management
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_programs_org_portfolio"
            ON "programs"("organization_id", "portfolio_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop all the performance indexes
        
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_allocations_org_resource_dates"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_allocations_project_dates"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_org_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_organization"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_work_items_project_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_risk_assessments_project_severity"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_portfolios_org_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_programs_org_portfolio"`);
    }
}
