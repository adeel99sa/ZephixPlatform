import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5: Add risk_presets and kpi_presets columns to project_templates table
 */
export class AddRiskAndKpiPresetsToTemplates1765000000007
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add risk_presets column
    await queryRunner.query(`
      ALTER TABLE "project_templates"
      ADD COLUMN IF NOT EXISTS "risk_presets" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    // Add kpi_presets column
    await queryRunner.query(`
      ALTER TABLE "project_templates"
      ADD COLUMN IF NOT EXISTS "kpi_presets" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project_templates"
      DROP COLUMN IF EXISTS "kpi_presets"
    `);

    await queryRunner.query(`
      ALTER TABLE "project_templates"
      DROP COLUMN IF EXISTS "risk_presets"
    `);
  }
}

