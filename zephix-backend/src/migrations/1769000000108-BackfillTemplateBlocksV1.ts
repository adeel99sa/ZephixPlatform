import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillTemplateBlocksV11769000000108
  implements MigrationInterface
{
  name = 'BackfillTemplateBlocksV11769000000108';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const legacyExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'template_blocks_legacy'
      ) AS exists;
    `);

    if (!legacyExists[0]?.exists) {
      return;
    }

    await queryRunner.query(`
      INSERT INTO template_blocks (
        organization_id,
        template_id,
        block_id,
        enabled,
        display_order,
        config,
        locked,
        created_at,
        updated_at
      )
      SELECT
        t.organization_id,
        t.id AS template_id,
        tbleg.block_id,
        true,
        COALESCE(tbleg.position, 0),
        COALESCE(tbleg.configuration_override, '{}'::jsonb),
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM template_blocks_legacy tbleg
      JOIN project_templates pt ON pt.id = tbleg.template_id
      JOIN templates t ON t.id = pt.template_id
      WHERE pt.template_id IS NOT NULL
        AND t.organization_id IS NOT NULL
      ON CONFLICT (organization_id, template_id, block_id) DO NOTHING;
    `);

    const unmapped = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM template_blocks_legacy tbleg
      LEFT JOIN project_templates pt ON pt.id = tbleg.template_id
      LEFT JOIN templates t ON t.id = pt.template_id
      WHERE t.id IS NULL;
    `);

    if ((unmapped[0]?.count ?? 0) > 0) {
      console.warn(
        `BackfillTemplateBlocksV1: unmapped legacy rows: ${unmapped[0].count}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // One-way migration by design
  }
}
