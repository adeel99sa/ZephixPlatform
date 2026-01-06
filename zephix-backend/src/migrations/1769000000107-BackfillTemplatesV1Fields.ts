import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillTemplatesV1Fields1769000000107
  implements MigrationInterface
{
  name = 'BackfillTemplatesV1Fields1769000000107';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const nullOrgs = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM templates
      WHERE organization_id IS NULL
        AND (is_system = false OR is_system IS NULL);
    `);

    if ((nullOrgs[0]?.count ?? 0) > 0) {
      throw new Error(
        `BackfillTemplatesV1Fields blocked. Non-system templates missing organization_id: ${nullOrgs[0].count}`,
      );
    }

    // One default per org
    await queryRunner.query(`
      WITH ranked_defaults AS (
        SELECT
          id,
          organization_id,
          ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at) AS rn
        FROM templates
        WHERE is_default = true
          AND organization_id IS NOT NULL
      )
      UPDATE templates
      SET is_default = false
      WHERE id IN (SELECT id FROM ranked_defaults WHERE rn > 1);
    `);

    // Normalize lock_state
    await queryRunner.query(`
      UPDATE templates
      SET lock_state = 'UNLOCKED'
      WHERE lock_state IS NULL;
    `);

    // Allow system templates with null org, enforce org for non-system
    const constraintExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_templates_org_id_for_non_system'
      ) AS exists;
    `);

    if (!constraintExists[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE templates
          ADD CONSTRAINT chk_templates_org_id_for_non_system
          CHECK (is_system = true OR organization_id IS NOT NULL);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE templates
        DROP CONSTRAINT IF EXISTS chk_templates_org_id_for_non_system;
    `);
  }
}

