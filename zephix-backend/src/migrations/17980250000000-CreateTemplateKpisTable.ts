import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wave 4B: Template ↔ KPI Binding
 *
 * Creates template_kpis table to allow templates to define default KPI sets.
 * When a project is instantiated from a template, the KPIs auto-activate
 * via project_kpi_configs.
 *
 * All statements are idempotent (IF NOT EXISTS / IF EXISTS).
 */
export class CreateTemplateKpisTable17980250000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS template_kpis (
        id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        template_id         uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        kpi_definition_id   uuid NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
        is_required         boolean NOT NULL DEFAULT false,
        default_target      numeric(18,4),
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now(),
        UNIQUE(template_id, kpi_definition_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_kpis_template
        ON template_kpis(template_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS template_kpis;`);
  }
}
