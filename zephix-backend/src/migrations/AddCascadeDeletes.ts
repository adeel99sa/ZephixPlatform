import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadeDeletes1234567890123 implements MigrationInterface {
  name = 'AddCascadeDeletes1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CASCADE DELETE constraints for project relationships
    
    // Drop existing foreign key constraints
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "FK_tasks_project_id"`);
    await queryRunner.query(`ALTER TABLE "project_phases" DROP CONSTRAINT IF EXISTS "FK_project_phases_project_id"`);
    await queryRunner.query(`ALTER TABLE "project_assignments" DROP CONSTRAINT IF EXISTS "FK_project_assignments_project_id"`);
    
    // Add new foreign key constraints with CASCADE DELETE
    await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "project_phases" ADD CONSTRAINT "FK_project_phases_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "project_assignments" ADD CONSTRAINT "FK_project_assignments_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the changes
    await queryRunner.query(`ALTER TABLE "project_assignments" DROP CONSTRAINT IF EXISTS "FK_project_assignments_project_id"`);
    await queryRunner.query(`ALTER TABLE "project_phases" DROP CONSTRAINT IF EXISTS "FK_project_phases_project_id"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "FK_tasks_project_id"`);
    
    // Add back the original constraints without CASCADE
    await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id")`);
    await queryRunner.query(`ALTER TABLE "project_phases" ADD CONSTRAINT "FK_project_phases_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id")`);
    await queryRunner.query(`ALTER TABLE "project_assignments" ADD CONSTRAINT "FK_project_assignments_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id")`);
  }
}
