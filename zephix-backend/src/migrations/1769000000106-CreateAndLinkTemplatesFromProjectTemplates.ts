import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAndLinkTemplatesFromProjectTemplates1769000000106
  implements MigrationInterface
{
  name = 'CreateAndLinkTemplatesFromProjectTemplates1769000000106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temp mapping table, pt_id only join
    await queryRunner.query(`
      CREATE TEMP TABLE tmp_pt_template_map (
        pt_id UUID PRIMARY KEY,
        template_id UUID NOT NULL
      ) ON COMMIT DROP;
    `);

    await queryRunner.query(`
      INSERT INTO tmp_pt_template_map (pt_id, template_id)
      SELECT pt.id, gen_random_uuid()
      FROM project_templates pt
      WHERE pt.template_id IS NULL
        AND pt.organization_id IS NOT NULL;
    `);

    // Create templates using the mapping
    await queryRunner.query(`
      INSERT INTO templates (
        id,
        name,
        description,
        kind,
        organization_id,
        created_by_id,
        is_active,
        is_system,
        version,
        created_at,
        updated_at,
        is_default,
        lock_state,
        methodology,
        metadata
      )
      SELECT
        m.template_id,
        pt.name,
        pt.description,
        'project'::text,
        pt.organization_id,
        pt.created_by_id,
        pt.is_active,
        pt.is_system,
        1,
        pt.created_at,
        pt.updated_at,
        pt.is_default,
        'UNLOCKED'::text,
        pt.methodology::text,
        '{}'::jsonb || jsonb_build_object('source', 'project_templates_migration_e1')
      FROM tmp_pt_template_map m
      JOIN project_templates pt ON pt.id = m.pt_id;
    `);

    // Link project_templates using the mapping
    await queryRunner.query(`
      UPDATE project_templates pt
      SET template_id = m.template_id
      FROM tmp_pt_template_map m
      WHERE pt.id = m.pt_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Unlink project_templates first
    await queryRunner.query(`
      UPDATE project_templates pt
      SET template_id = NULL
      WHERE template_id IN (
        SELECT id FROM templates
        WHERE (metadata ->> 'source') = 'project_templates_migration_e1'
      );
    `);

    // Delete only rows created by this migration
    await queryRunner.query(`
      DELETE FROM templates
      WHERE (metadata ->> 'source') = 'project_templates_migration_e1';
    `);
  }
}
