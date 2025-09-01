import { MigrationInterface, QueryRunner } from "typeorm";

export class FixNamingAndConstraints1756400000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Fix naming convention - Convert new tables to camelCase to match existing
        // Drop the incorrectly named tables first
        await queryRunner.query(`DROP TABLE IF EXISTS risk_signals CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS user_daily_capacity CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS work_items CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS templates CASCADE`);

        // 2. Recreate templates table with camelCase naming
        await queryRunner.query(`
            CREATE TABLE "templates" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "name" VARCHAR(100) NOT NULL,
                "methodology" VARCHAR(50) NOT NULL CHECK ("methodology" IN ('waterfall', 'scrum')),
                "structure" JSONB NOT NULL,
                "metrics" JSONB DEFAULT '[]'::jsonb,
                "isActive" BOOLEAN DEFAULT true,
                "isSystem" BOOLEAN DEFAULT true,
                "organizationId" UUID,
                "version" INTEGER DEFAULT 1,
                "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX "idx_templates_org" ON "templates"("organizationId") WHERE "organizationId" IS NOT NULL;
        `);

        // 3. Recreate work_items table with camelCase naming
        await queryRunner.query(`
            CREATE TABLE "workItems" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "projectId" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
                "type" VARCHAR(50) NOT NULL CHECK ("type" IN ('task', 'story', 'bug', 'epic')),
                "title" VARCHAR(255) NOT NULL,
                "description" TEXT,
                "status" VARCHAR(20) DEFAULT 'todo' CHECK ("status" IN ('todo', 'in_progress', 'done', 'blocked')),
                "phaseOrSprint" VARCHAR(100),
                "assignedTo" UUID,
                "plannedStart" DATE,
                "plannedEnd" DATE,
                "actualStart" DATE,
                "actualEnd" DATE,
                "effortPoints" INTEGER,
                "priority" VARCHAR(10) DEFAULT 'medium' CHECK ("priority" IN ('low', 'medium', 'high', 'critical')),
                "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX "idx_work_items_project" ON "workItems"("projectId");
            CREATE INDEX "idx_work_items_assigned" ON "workItems"("assignedTo");
            CREATE INDEX "idx_work_items_status" ON "workItems"("status");
        `);

        // 4. Recreate user_daily_capacity table with camelCase naming
        await queryRunner.query(`
            CREATE TABLE "userDailyCapacity" (
                "organizationId" UUID NOT NULL,
                "userId" UUID NOT NULL,
                "capacityDate" DATE NOT NULL,
                "allocatedPercentage" INTEGER DEFAULT 0 CHECK ("allocatedPercentage" >= 0),
                PRIMARY KEY ("organizationId", "userId", "capacityDate")
            );
            CREATE INDEX "idx_daily_capacity_org_date" ON "userDailyCapacity"("organizationId", "capacityDate");
        `);

        // 5. Recreate risk_signals table with camelCase naming
        await queryRunner.query(`
            CREATE TABLE "riskSignals" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "organizationId" UUID NOT NULL,
                "projectId" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
                "workItemId" UUID REFERENCES "workItems"("id") ON DELETE CASCADE,
                "signalType" VARCHAR(50) NOT NULL CHECK ("signalType" IN ('OVERALLOCATION', 'DEADLINE_SLIP')),
                "severity" VARCHAR(10) NOT NULL CHECK ("severity" IN ('low', 'medium', 'high', 'critical')),
                "details" JSONB NOT NULL,
                "status" VARCHAR(15) DEFAULT 'unack' CHECK ("status" IN ('unack', 'ack', 'resolved')),
                "acknowledgedBy" UUID,
                "acknowledgedAt" TIMESTAMPTZ,
                "resolvedBy" UUID,
                "resolvedAt" TIMESTAMPTZ,
                "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX "idx_risk_signals_project" ON "riskSignals"("projectId");
            CREATE INDEX "idx_risk_signals_status" ON "riskSignals"("status");
        `);

        // 6. Add missing columns to existing projects table
        await queryRunner.query(`
            ALTER TABLE "projects" 
            ADD COLUMN IF NOT EXISTS "startDate" DATE,
            ADD COLUMN IF NOT EXISTS "endDate" DATE;
        `);

        // 7. Add status CHECK constraint to projects table
        await queryRunner.query(`
            ALTER TABLE "projects" 
            ADD CONSTRAINT "projects_status_check" 
            CHECK ("status" IN ('planning', 'active', 'on-hold', 'completed', 'cancelled'));
        `);

        // 8. Fix resource_allocations table - add missing columns and fix indexes
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            ADD COLUMN IF NOT EXISTS "workItemId" UUID REFERENCES "workItems"("id") ON DELETE SET NULL;
        `);

        // 9. Add missing columns to resource_allocations for consistency FIRST
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            ADD COLUMN IF NOT EXISTS "organizationId" UUID,
            ADD COLUMN IF NOT EXISTS "userId" UUID;
        `);

        // 10. Update existing resource_allocations to set userId from resourceId
        await queryRunner.query(`
            UPDATE "resource_allocations" 
            SET "userId" = "resourceId" 
            WHERE "userId" IS NULL;
        `);

        // 11. Drop incorrect indexes and recreate with correct column names
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_allocations_resource_dates"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_allocations_project"`);
        
        await queryRunner.query(`
            CREATE INDEX "idx_allocations_org_user_dates" ON "resource_allocations"("resourceId", "userId", "startDate", "endDate");
            CREATE INDEX "idx_allocations_project" ON "resource_allocations"("projectId");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop new tables
        await queryRunner.query(`DROP TABLE IF EXISTS "riskSignals" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "userDailyCapacity" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "workItems" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "templates" CASCADE`);
        
        // Remove added columns from existing tables
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "startDate"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "endDate"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_status_check"`);
        await queryRunner.query(`ALTER TABLE "resource_allocations" DROP COLUMN IF EXISTS "workItemId"`);
        await queryRunner.query(`ALTER TABLE "resource_allocations" DROP COLUMN IF EXISTS "organizationId"`);
        await queryRunner.query(`ALTER TABLE "resource_allocations" DROP COLUMN IF EXISTS "userId"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_allocations_org_user_dates"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_allocations_project"`);
    }
}
