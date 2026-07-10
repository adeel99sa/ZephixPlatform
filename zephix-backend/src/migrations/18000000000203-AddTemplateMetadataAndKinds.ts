import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TC-B1 — Template metadata foundation.
 *
 * 1. templates.is_preferred BOOLEAN NOT NULL DEFAULT false — catalog "preferred" flag.
 * 2. templates.usage_count INTEGER NOT NULL DEFAULT 0 — incremented atomically on
 *    each successful instantiate-v5_1.
 * 3. Extend the kind allowlist to the three founder-approved template kinds
 *    (project | board | mixed) + (document | form).
 *
 * Constraint rule (feedback_constraint_migration_rule): the `kind` column is a
 * VARCHAR(20) guarded by a CHECK constraint (NOT a pg enum). Current constraint
 * read LIVE from staging on 2026-07-10, definition verbatim:
 *   templates_kind_check:
 *     CHECK ((kind)::text = ANY (ARRAY['project','board','mixed']::character varying[]))
 * Distinct kind values in use (live 2026-07-10): 'project' (36 rows) only — no row
 * is orphaned by the additive rewrite. New allowlist is derived from the live
 * definition ∪ {document, form}; down() restores the live-read original verbatim.
 */
export class AddTemplateMetadataAndKinds18000000000203
  implements MigrationInterface
{
  name = 'AddTemplateMetadataAndKinds18000000000203';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1 + 2: additive metadata columns (idempotent).
    await queryRunner.query(
      `ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "is_preferred" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "usage_count" integer NOT NULL DEFAULT 0`,
    );

    // 3: extend kind allowlist additively (live-derived ∪ {document, form}).
    await queryRunner.query(
      `ALTER TABLE "templates" DROP CONSTRAINT IF EXISTS "templates_kind_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "templates" ADD CONSTRAINT "templates_kind_check" CHECK (
        (kind)::text = ANY (
          (ARRAY[
            'project'::character varying,
            'board'::character varying,
            'mixed'::character varying,
            'document'::character varying,
            'form'::character varying
          ])::text[]
        )
      )`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the live-read original allowlist verbatim. This will FAIL if any
    // row has kind IN ('document','form') by rollback time — accepted and
    // intentional (remediate those rows before rolling back).
    await queryRunner.query(
      `ALTER TABLE "templates" DROP CONSTRAINT IF EXISTS "templates_kind_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "templates" ADD CONSTRAINT "templates_kind_check" CHECK (
        (kind)::text = ANY (
          (ARRAY[
            'project'::character varying,
            'board'::character varying,
            'mixed'::character varying
          ])::text[]
        )
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "templates" DROP COLUMN IF EXISTS "usage_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "templates" DROP COLUMN IF EXISTS "is_preferred"`,
    );
  }
}
