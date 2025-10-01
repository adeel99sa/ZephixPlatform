import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectCascades1735689600000 implements MigrationInterface {
    name = 'AddProjectCascades1735689600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add CASCADE DELETE to project_assignments table
        await queryRunner.query(`
            ALTER TABLE "project_assignments" 
            DROP CONSTRAINT IF EXISTS "project_assignments_project_id_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "project_assignments" 
            ADD CONSTRAINT "project_assignments_project_id_fkey" 
            FOREIGN KEY ("project_id") 
            REFERENCES "projects"("id") 
            ON DELETE CASCADE
        `);

        // Add CASCADE DELETE to resource_allocations table
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            DROP CONSTRAINT IF EXISTS "resource_allocations_project_id_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            ADD CONSTRAINT "resource_allocations_project_id_fkey" 
            FOREIGN KEY ("project_id") 
            REFERENCES "projects"("id") 
            ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert CASCADE DELETE from project_assignments table
        await queryRunner.query(`
            ALTER TABLE "project_assignments" 
            DROP CONSTRAINT IF EXISTS "project_assignments_project_id_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "project_assignments" 
            ADD CONSTRAINT "project_assignments_project_id_fkey" 
            FOREIGN KEY ("project_id") 
            REFERENCES "projects"("id")
        `);

        // Revert CASCADE DELETE from resource_allocations table
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            DROP CONSTRAINT IF EXISTS "resource_allocations_project_id_fkey"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "resource_allocations" 
            ADD CONSTRAINT "resource_allocations_project_id_fkey" 
            FOREIGN KEY ("project_id") 
            REFERENCES "projects"("id")
        `);
    }
}
