import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TC-B3 — write-path symmetry: statuses.
 *
 * Adds `templates.status_groups` (JSONB, nullable). ORG/custom templates saved
 * from a project store their per-project status set here (statusKey,
 * displayName, color, order, bucket, isDefault). SYSTEM templates keep their
 * status sets in code (SYSTEM_TEMPLATE_DEFS) and leave this column NULL.
 *
 * instantiate-v5_1 status resolution order becomes:
 *   SYSTEM_TEMPLATE_DEFS.statusGroups → templates.status_groups → 7 defaults.
 *
 * Additive + reversible. Idempotent via IF [NOT] EXISTS.
 */
export class AddTemplateStatusGroups18000000000205
  implements MigrationInterface
{
  name = 'AddTemplateStatusGroups18000000000205';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "status_groups" jsonb NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "templates" DROP COLUMN IF EXISTS "status_groups"`,
    );
  }
}
