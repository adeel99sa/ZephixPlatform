import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAIGenerationToIntakeForms1735598000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column exists before adding it
        const columnExists = await queryRunner.hasColumn("intake_forms", "aiGenerationContext");
        
        if (!columnExists) {
            await queryRunner.query(`
                ALTER TABLE "intake_forms" 
                ADD COLUMN "aiGenerationContext" jsonb
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn("intake_forms", "aiGenerationContext");
        
        if (columnExists) {
            await queryRunner.query(`
                ALTER TABLE "intake_forms" 
                DROP COLUMN "aiGenerationContext"
            `);
        }
    }
}