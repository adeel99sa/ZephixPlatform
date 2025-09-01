import { MigrationInterface, QueryRunner } from "typeorm";

export class FixForeignKeyConstraints1756684729593 implements MigrationInterface {
    name = 'FixForeignKeyConstraints1756684729593'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fix foreign key constraints after table renaming
        
        // 1. Drop existing foreign key constraints that reference camelCase tables
        await queryRunner.query(`
            ALTER TABLE "project_allocations" 
            DROP CONSTRAINT IF EXISTS "project_allocations_work_item_id_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            DROP CONSTRAINT IF EXISTS "resource_allocations_workItemId_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "riskSignals" 
            DROP CONSTRAINT IF EXISTS "riskSignals_workItemId_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "riskSignals" 
            DROP CONSTRAINT IF EXISTS "riskSignals_projectId_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "workItems" 
            DROP CONSTRAINT IF EXISTS "workItems_projectId_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "userOrganizations" 
            DROP CONSTRAINT IF EXISTS "userOrganizations_organizationId_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "userOrganizations" 
            DROP CONSTRAINT IF EXISTS "userOrganizations_userId_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "refreshTokens" 
            DROP CONSTRAINT IF EXISTS "refreshTokens_userId_fkey"
        `);
        
        // 2. Recreate foreign key constraints with correct table references
        await queryRunner.query(`
            ALTER TABLE "project_allocations" 
            ADD CONSTRAINT "project_allocations_work_item_id_fkey" 
            FOREIGN KEY ("work_item_id") REFERENCES "work_items"(id) ON DELETE SET NULL
        `);
        
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            ADD CONSTRAINT "resource_allocations_workItemId_fkey" 
            FOREIGN KEY ("workItemId") REFERENCES "work_items"(id) ON DELETE SET NULL
        `);
        
        await queryRunner.query(`
            ALTER TABLE "risk_signals" 
            ADD CONSTRAINT "risk_signals_work_item_id_fkey" 
            FOREIGN KEY ("workItemId") REFERENCES "work_items"(id) ON DELETE SET NULL
        `);
        
        await queryRunner.query(`
            ALTER TABLE "risk_signals" 
            ADD CONSTRAINT "risk_signals_project_id_fkey" 
            FOREIGN KEY ("projectId") REFERENCES "projects"(id) ON DELETE CASCADE
        `);
        
        await queryRunner.query(`
            ALTER TABLE "work_items" 
            ADD CONSTRAINT "work_items_project_id_fkey" 
            FOREIGN KEY ("projectId") REFERENCES "projects"(id) ON DELETE CASCADE
        `);
        
        await queryRunner.query(`
            ALTER TABLE "user_organizations" 
            ADD CONSTRAINT "user_organizations_organization_id_fkey" 
            FOREIGN KEY ("organizationId") REFERENCES "organizations"(id) ON DELETE CASCADE
        `);
        
        await queryRunner.query(`
            ALTER TABLE "user_organizations" 
            ADD CONSTRAINT "user_organizations_user_id_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE CASCADE
        `);
        
        await queryRunner.query(`
            ALTER TABLE "refresh_tokens" 
            ADD CONSTRAINT "refresh_tokens_user_id_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE CASCADE
        `);
        
        // 3. Add missing foreign key constraints for resource_allocations
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse the foreign key constraint changes
        
        // Drop the new constraints
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            DROP CONSTRAINT IF EXISTS "fk_resource_allocations_organization"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            DROP CONSTRAINT IF EXISTS "fk_resource_allocations_user"
        `);
        
        // Drop the recreated constraints
        await queryRunner.query(`
            ALTER TABLE "project_allocations" 
            DROP CONSTRAINT IF EXISTS "project_allocations_work_item_id_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            DROP CONSTRAINT IF EXISTS "resource_allocations_workItemId_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "risk_signals" 
            DROP CONSTRAINT IF EXISTS "risk_signals_work_item_id_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "risk_signals" 
            DROP CONSTRAINT IF EXISTS "risk_signals_project_id_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "work_items" 
            DROP CONSTRAINT IF EXISTS "work_items_project_id_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "user_organizations" 
            DROP CONSTRAINT IF EXISTS "user_organizations_organization_id_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "user_organizations" 
            DROP CONSTRAINT IF EXISTS "user_organizations_user_id_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "refresh_tokens" 
            DROP CONSTRAINT IF EXISTS "refresh_tokens_user_id_fkey"
        `);
        
        // Recreate the original constraints (this would need to be done manually
        // as we don't have the exact original constraint names)
    }
}
