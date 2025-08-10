import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAIGenerationToIntakeForms1735598000000 implements MigrationInterface {
  name = 'AddAIGenerationToIntakeForms1735598000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add AI generation context column
    await queryRunner.query(`
      ALTER TABLE "intake_forms" 
      ADD COLUMN "aiGenerationContext" jsonb
    `);

    // Add intelligent features column
    await queryRunner.query(`
      ALTER TABLE "intake_forms" 
      ADD COLUMN "intelligentFeatures" jsonb
    `);

    // Add comments to document the new columns
    await queryRunner.query(`
      COMMENT ON COLUMN "intake_forms"."aiGenerationContext" IS 'AI form generation metadata including original description, refinement history, and confidence scores'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "intake_forms"."intelligentFeatures" IS 'AI-powered features including conditional logic, smart validation, and workflow configuration'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove AI generation context column
    await queryRunner.query(`
      ALTER TABLE "intake_forms" 
      DROP COLUMN "aiGenerationContext"
    `);

    // Remove intelligent features column
    await queryRunner.query(`
      ALTER TABLE "intake_forms" 
      DROP COLUMN "intelligentFeatures"
    `);
  }
}
