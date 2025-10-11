import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsolidateAllocationTables1756684640553 implements MigrationInterface {
    name = 'ConsolidateAllocationTables1756684640553'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Add missing columns to resource_allocations if they don't exist
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            ADD COLUMN IF NOT EXISTS "organization_id" uuid,
            ADD COLUMN IF NOT EXISTS "user_id" uuid,
            ADD COLUMN IF NOT EXISTS "updated_at" timestamp without time zone DEFAULT now()
        `);

        // Step 2: Migrate data from project_allocations to resource_allocations
        await queryRunner.query(`
            INSERT INTO "resource_allocations" (
                "id", "resourceId", "projectId", "startDate", "endDate", 
                "allocationPercentage", "hoursPerDay", "createdAt", "workItemId",
                "organization_id", "user_id", "updated_at"
            )
            SELECT 
                gen_random_uuid(), -- Generate new ID to avoid conflicts
                pa.user_id as "resourceId", -- Map user_id to resourceId
                pa.project_id as "projectId",
                pa.start_date as "startDate",
                pa.end_date as "endDate",
                pa.allocation_percentage as "allocationPercentage",
                8 as "hoursPerDay", -- Default value
                pa.created_at as "createdAt",
                pa.work_item_id as "workItemId",
                pa.organization_id,
                pa.user_id,
                pa.updated_at
            FROM "project_allocations" pa
            ON CONFLICT DO NOTHING
        `);

        // Step 3: Update existing resource_allocations to set organization_id and user_id
        // where they are null, using the project's organization
        await queryRunner.query(`
            UPDATE "resource_allocations" ra
            SET 
                "organization_id" = p.organization_id,
                "user_id" = ra."resourceId"
            FROM "projects" p
            WHERE ra."projectId" = p.id 
            AND ra."organization_id" IS NULL
        `);

        // Step 4: Add foreign key constraints for the new columns
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            ADD CONSTRAINT "fk_resource_allocations_organization" 
            FOREIGN KEY ("organization_id") REFERENCES "organizations"(id) ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            ADD CONSTRAINT "fk_resource_allocations_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"(id) ON DELETE CASCADE
        `);

        // Step 5: Add indexes for the new columns
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_allocations_org_user_dates_new" 
            ON "resource_allocations"("organization_id", "user_id", "startDate", "endDate")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_allocations_org_resource_dates" 
            ON "resource_allocations"("organization_id", "resourceId", "startDate", "endDate")
        `);

        // Step 6: Drop the project_allocations table
        await queryRunner.query(`DROP TABLE IF EXISTS "project_allocations" CASCADE`);

        // Step 7: Clean up old indexes that are no longer needed
        await queryRunner.query(`
            DROP INDEX IF EXISTS "idx_allocations_org_user_dates"
        `);

        // Step 8: Rename the new index to the standard name
        await queryRunner.query(`
            ALTER INDEX "idx_allocations_org_user_dates_new" 
            RENAME TO "idx_allocations_org_user_dates"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate project_allocations table
        await queryRunner.query(`
            CREATE TABLE "project_allocations" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "organization_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "project_id" uuid NOT NULL,
                "work_item_id" uuid,
                "start_date" date NOT NULL,
                "end_date" date NOT NULL,
                "allocation_percentage" integer NOT NULL,
                "created_at" timestamp without time zone DEFAULT now(),
                "updated_at" timestamp without time zone DEFAULT now(),
                CONSTRAINT "project_allocations_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "project_allocations_allocation_percentage_check" 
                    CHECK ("allocation_percentage" >= 1 AND "allocation_percentage" <= 100),
                CONSTRAINT "valid_date_range" CHECK ("start_date" <= "end_date"),
                CONSTRAINT "project_allocations_project_id_fkey" 
                    FOREIGN KEY ("project_id") REFERENCES "projects"(id) ON DELETE CASCADE,
                CONSTRAINT "project_allocations_work_item_id_fkey" 
                    FOREIGN KEY ("work_item_id") REFERENCES "workItems"(id) ON DELETE SET NULL
            )
        `);

        // Recreate indexes
        await queryRunner.query(`
            CREATE INDEX "idx_proj_alloc_org_user_dates" 
            ON "project_allocations"("organization_id", "user_id", "start_date", "end_date")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_proj_alloc_project" 
            ON "project_allocations"("project_id")
        `);

        // Migrate data back (this is a simplified reverse migration)
        await queryRunner.query(`
            INSERT INTO "project_allocations" (
                "id", "organization_id", "user_id", "project_id", "work_item_id",
                "start_date", "end_date", "allocation_percentage", "created_at", "updated_at"
            )
            SELECT 
                gen_random_uuid(),
                ra."organization_id",
                ra."user_id",
                ra."projectId",
                ra."workItemId",
                ra."startDate",
                ra."endDate",
                ra."allocationPercentage",
                ra."createdAt",
                ra."updated_at"
            FROM "resource_allocations" ra
            WHERE ra."organization_id" IS NOT NULL AND ra."user_id" IS NOT NULL
        `);

        // Remove the added columns from resource_allocations
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            DROP COLUMN IF EXISTS "organization_id",
            DROP COLUMN IF EXISTS "user_id",
            DROP COLUMN IF EXISTS "updated_at"
        `);

        // Drop the added constraints
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            DROP CONSTRAINT IF EXISTS "fk_resource_allocations_organization",
            DROP CONSTRAINT IF EXISTS "fk_resource_allocations_user"
        `);

        // Drop the added indexes
        await queryRunner.query(`
            DROP INDEX IF EXISTS "idx_allocations_org_user_dates",
            DROP INDEX IF EXISTS "idx_allocations_org_resource_dates"
        `);

        // Recreate the old index
        await queryRunner.query(`
            CREATE INDEX "idx_allocations_org_user_dates" 
            ON "resource_allocations"("resourceId", "userId", "startDate", "endDate")
        `);
    }
}
