import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TC-B2 — AD-029 template-catalog cleanup (data surgery, founder-approved
 * 2026-07-10, all mutations surfaced + relayed before this migration was written).
 *
 * Ruled outcomes:
 *  - `methodology` is canonical (vocabulary: waterfall | scrum | kanban | hybrid,
 *    lowercase). `agile` → `scrum` (T6 merge). `delivery_method` deprecated
 *    (stop-write in code; column kept; drop banked for a later migration).
 *  - Duplicate Waterfall pm_waterfall_v1 (3dc439f5) archived.
 *  - 8 sandbox test-debris rows archived (never deleted).
 *  - Additive CHECK guards the 4-value vocabulary going forward.
 *
 * Live-read (staging 2026-07-10): no pre-existing methodology CHECK/enum on
 * `templates`. Distinct methodology pre-backfill = {agile 11, waterfall 7,
 * hybrid 7, kanban 5, NULL 7}; only `agile` needs rewriting. All UPDATEs are
 * idempotent via WHERE guards.
 *
 * Reversibility: down() drops the CHECK only. The data changes (backfill,
 * archives) are FORWARD-ONLY and intentionally NOT reverted — same precedent as
 * migrations 197/198 (you cannot know which rows were `agile` before the merge).
 */
export class AD029TemplateMethodologyCleanup18000000000204
  implements MigrationInterface
{
  name = 'AD029TemplateMethodologyCleanup18000000000204';

  // AD-029 duplicate Waterfall (pm_waterfall_v1). The surviving canonical is
  // pm_waterfall_v2 (e1add877), left untouched.
  private readonly DUPLICATE_WATERFALL_ID =
    '3dc439f5-12e2-46bf-b517-f28d9973bebe';

  // Sandbox test debris: 7 Wave4 auto-test templates (2026-02-17) + the TC-B1
  // Stage-2 save-as-template artifact. Archive, never delete (standing
  // principle; founder veto remains open on this line).
  private readonly DEBRIS_IDS = [
    '3a277af8-322b-48b2-941b-b6c4e75e81b4',
    '7bd1e197-6ab6-4136-a341-f58cad525987',
    '2e414354-779e-4fb0-8543-da72329152ec',
    '4f01eaca-9a2f-44b7-94da-3a1b85e029fb',
    '244f6817-671b-47d5-b58f-a4e4a3f44a1e',
    'd47a83e0-7810-4105-ac75-e50126fb43dd',
    '7b4c5432-007f-4a70-8efd-5a816df89777',
    '3d32da56-d049-44cb-8e4b-d00fc501f76c',
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Backfill: agile → scrum (canonical vocabulary). Expect ~11 rows.
    await queryRunner.query(
      `UPDATE "templates" SET methodology = 'scrum' WHERE methodology = 'agile'`,
    );

    // 2. Archive the AD-029 duplicate Waterfall (pm_waterfall_v1). Expect 1.
    await queryRunner.query(
      `UPDATE "templates"
          SET archived_at = now(), is_active = false, is_published = false
        WHERE id = $1 AND archived_at IS NULL`,
      [this.DUPLICATE_WATERFALL_ID],
    );

    // 3. Archive sandbox test debris (never delete). Expect 8.
    await queryRunner.query(
      `UPDATE "templates"
          SET archived_at = now(), is_active = false, is_published = false
        WHERE id = ANY($1::uuid[]) AND archived_at IS NULL`,
      [this.DEBRIS_IDS],
    );

    // 4. Additive, NULL-tolerant CHECK constraint (runs AFTER backfill, so no
    //    'agile' remains to violate it). Derived from the ruled 4-value vocab.
    await queryRunner.query(
      `ALTER TABLE "templates" DROP CONSTRAINT IF EXISTS "templates_methodology_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "templates" ADD CONSTRAINT "templates_methodology_check" CHECK (
        methodology IS NULL OR (methodology)::text = ANY (
          (ARRAY[
            'waterfall'::character varying,
            'scrum'::character varying,
            'kanban'::character varying,
            'hybrid'::character varying
          ])::text[]
        )
      )`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Forward-only data changes are NOT reverted (see class doc). Only the
    // additive CHECK is removed.
    await queryRunner.query(
      `ALTER TABLE "templates" DROP CONSTRAINT IF EXISTS "templates_methodology_check"`,
    );
  }
}
