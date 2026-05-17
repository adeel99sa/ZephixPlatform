import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Clean test debris from `templates`.
 *
 * Context:
 *   - Staging recon (2026-05-17) confirmed 7 rows whose names match the
 *     test/smoke/debug patterns: "Custom Smoke …", "*Debug Template",
 *     "Census Default Template2 …", "Test Template Probe". All 7 are
 *     `template_scope = 'ORG'` and `is_system = false`, created by smoke
 *     test users. None are SYSTEM templates.
 *   - The original spec referenced columns `source` and `created_by` that
 *     do not exist on this table; the equivalents are `template_scope`
 *     and `created_by_id`. The SYSTEM/null-creator guards were also
 *     contradictory to the actual data (all debris is ORG-scoped with
 *     non-null creator). The guards here are inverted into defense-in-depth:
 *     restrict to ORG/non-system so a future SYSTEM template that happens
 *     to share a name pattern can never be deleted by replaying this
 *     migration.
 *
 * Down: forward-only cleanup. Debris rows must not be restored.
 */
export class CleanTemplateDebris18000000000174 implements MigrationInterface {
  name = 'CleanTemplateDebris18000000000174';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(
      `DELETE FROM "templates"
       WHERE (
         "name" ILIKE '%debug%'
         OR "name" ILIKE '%smoke%'
         OR "name" ILIKE 'Census Default%'
         OR "name" ILIKE 'Test Template%'
       )
       AND "template_scope" = 'ORG'
       AND "is_system" = false
       RETURNING "id", "name"`,
    );
    const rows = Array.isArray(result) ? result : [];
    // eslint-disable-next-line no-console
    console.log(
      `[CleanTemplateDebris] deleted ${rows.length} template rows: ${rows
        .map((r: { name: string }) => r.name)
        .join(', ')}`,
    );
  }

  public async down(): Promise<void> {
    // Forward-only cleanup; intentional no-op. Debris rows are not restorable.
  }
}
