import { MigrationInterface, QueryRunner } from "typeorm";

export class FixTemplateIdColumn1756400000003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fix the template_id column to be templateId with proper UUID type and foreign key
        await queryRunner.query(`
            ALTER TABLE "projects" 
            DROP COLUMN IF EXISTS "template_id";
        `);
        
        await queryRunner.query(`
            ALTER TABLE "projects" 
            ADD COLUMN "templateId" UUID REFERENCES "templates"("id");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert the change
        await queryRunner.query(`
            ALTER TABLE "projects" 
            DROP COLUMN IF EXISTS "templateId";
        `);
        
        await queryRunner.query(`
            ALTER TABLE "projects" 
            ADD COLUMN "template_id" UUID REFERENCES "templates"("id");
        `);
    }
}
