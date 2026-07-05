import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 193 — SYSTEM attribute library seed (AD-024 Phase 7)
 *
 * Inserts 17 platform-curated SYSTEM attribute definitions.
 * All rows: scope='SYSTEM', organization_id=NULL, workspace_id=NULL,
 * locked=false, is_active=true.
 *
 * Idempotent: INSERT ... ON CONFLICT (organization_id, scope, workspace_id, key)
 * DO NOTHING — safe to re-run; existing rows are untouched.
 *
 * Template attachments (31 rows) are inserted after definitions, also idempotent
 * via ON CONFLICT (template_id, attribute_definition_id) DO NOTHING.
 *
 * EMPTY-DB SAFETY (in-place edit — 2026-07-04):
 *   Original used a hardcoded UUID literal in each SELECT
 *   (e.g. SELECT '<uuid>'::uuid, id, false, ord FROM ...).
 *   On a fresh DB the `templates` table is empty, so the FK on
 *   template_attribute_definitions.template_id fires and CI fails.
 *   Fix: each attachment block now JOINs `templates t ON t.id = '<uuid>'::uuid`
 *   so zero rows are returned (and zero rows inserted) when the template is
 *   absent — no FK violation.
 *   Safe to edit in place: migration is recorded as executed on staging and
 *   will not re-run there; fresh DBs get this corrected version.
 *
 * Debt register O4: duplicate Waterfall Project templates
 *   canonical: e1add877-400a-4452-b388-80926bc15919 (created 2026-04-09)
 *   duplicate: 3dc439f5-12e2-46bf-b517-f28d9973bebe (created 2026-04-20)
 *   → consolidate at AD-029 (Engine 4 template authority work).
 *   Attachments seeded to canonical only.
 *
 * W2 input note — platform.governance.approval_status:
 *   This is a manual field. When Engine 5 (E5) ships real gate approvals,
 *   this field must either be superseded by the system-managed gate state
 *   or deprecated. Flag for W2 spec: "approval_status — supersede or
 *   systemize decision required before E5 merge".
 */
export class SeedSystemAttributeDefinitions18000000000193 implements MigrationInterface {
  name = 'SeedSystemAttributeDefinitions18000000000193';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. SYSTEM attribute definitions ──────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO attribute_definitions
        (scope, key, label, data_type, locked, required, is_active, options)
      VALUES
        -- Cost
        ('SYSTEM', 'platform.cost.cost_center',           'Cost Center / GL Code',        'text',          false, false, true, NULL),
        ('SYSTEM', 'platform.cost.budget_at_completion',  'Budget at Completion (BAC)',    'currency',      false, false, true, NULL),

        -- Risk
        ('SYSTEM', 'platform.risk.response_strategy', 'Response Strategy', 'single_select', false, false, true,
          '{"values":["Avoid","Mitigate","Transfer","Accept (negative)","Exploit","Enhance","Share","Accept (positive)","Escalate"]}'::jsonb),
        ('SYSTEM', 'platform.risk.probability', 'Probability', 'single_select', false, false, true,
          '{"values":["Very Low (1)","Low (2)","Moderate (3)","High (4)","Very High (5)"]}'::jsonb),
        ('SYSTEM', 'platform.risk.impact', 'Impact', 'single_select', false, false, true,
          '{"values":["Very Low (1)","Low (2)","Moderate (3)","High (4)","Very High (5)"]}'::jsonb),
        ('SYSTEM', 'platform.risk.category', 'Risk Category', 'single_select', false, false, true,
          '{"values":["Schedule","Cost","Quality","Resource","Technical","External","Organizational","Compliance","Strategic"]}'::jsonb),

        -- Governance
        -- W2 input: supersede-or-systemize when E5 gate approvals ship
        ('SYSTEM', 'platform.governance.approval_status', 'Approval Status', 'single_select', false, false, true,
          '{"values":["Not Required","Pending","Under Review","Approved","Rejected","Waived"]}'::jsonb),

        -- Agile
        -- story_type options: Spike/Bug/Epic excluded — collide with TaskType enum values
        ('SYSTEM', 'platform.agile.story_type', 'Story Type', 'single_select', false, false, true,
          '{"values":["User Story","Technical Story","Chore","Theme"]}'::jsonb),
        ('SYSTEM', 'platform.agile.business_value',             'Business Value Score',        'number',        false, false, true, NULL),
        ('SYSTEM', 'platform.agile.sprint_goal_contribution',   'Sprint Goal Contribution',    'long_text',     false, false, true, NULL),

        -- Estimation
        ('SYSTEM', 'platform.estimation.story_size_tshirt', 'T-Shirt Size', 'single_select', false, false, true,
          '{"values":["XS","S","M","L","XL","XXL"]}'::jsonb),
        ('SYSTEM', 'platform.estimation.optimistic',   'Optimistic Estimate',   'duration', false, false, true, NULL),
        ('SYSTEM', 'platform.estimation.most_likely',  'Most Likely Estimate',  'duration', false, false, true, NULL),
        ('SYSTEM', 'platform.estimation.pessimistic',  'Pessimistic Estimate',  'duration', false, false, true, NULL),

        -- Quality
        ('SYSTEM', 'platform.quality.acceptance_criteria_status', 'Acceptance Criteria Status', 'single_select', false, false, true,
          '{"values":["Not Started","In Progress","Met","Failed","Waived"]}'::jsonb),

        -- External integration
        ('SYSTEM', 'platform.external.system_reference', 'External System Reference', 'text', false, false, true, NULL),

        -- Stakeholder
        ('SYSTEM', 'platform.stakeholder.raci_role', 'RACI Role', 'single_select', false, false, true,
          '{"values":["Responsible","Accountable","Consulted","Informed"]}'::jsonb)

      ON CONFLICT (organization_id, scope, workspace_id, key) DO NOTHING;
    `);

    // ── 2. Template attachments ───────────────────────────────────────────────
    // Helper: resolve attribute_definition_id by key, then insert attachment.
    // ON CONFLICT (template_id, attribute_definition_id) DO NOTHING — idempotent.

    // Waterfall Project (canonical: e1add877-400a-4452-b388-80926bc15919) — 11 attachments
    await queryRunner.query(`
      INSERT INTO template_attribute_definitions (template_id, attribute_definition_id, locked, display_order)
      SELECT t.id, ad.id, false, v.ord
      FROM (VALUES
        ('platform.cost.cost_center',              0),
        ('platform.cost.budget_at_completion',     1),
        ('platform.estimation.optimistic',         2),
        ('platform.estimation.most_likely',        3),
        ('platform.estimation.pessimistic',        4),
        ('platform.risk.probability',              5),
        ('platform.risk.impact',                   6),
        ('platform.risk.response_strategy',        7),
        ('platform.risk.category',                 8),
        ('platform.governance.approval_status',    9),
        ('platform.stakeholder.raci_role',        10)
      ) AS v(k, ord)
      JOIN attribute_definitions ad ON ad.key = v.k AND ad.scope = 'SYSTEM'
      JOIN templates t ON t.id = 'e1add877-400a-4452-b388-80926bc15919'::uuid
      ON CONFLICT (template_id, attribute_definition_id) DO NOTHING;
    `);

    // Agile Project (0183f58a-d1d7-4723-a7fe-92303719dd43) — 5 attachments
    await queryRunner.query(`
      INSERT INTO template_attribute_definitions (template_id, attribute_definition_id, locked, display_order)
      SELECT t.id, ad.id, false, v.ord
      FROM (VALUES
        ('platform.agile.story_type',                  0),
        ('platform.agile.business_value',              1),
        ('platform.estimation.story_size_tshirt',      2),
        ('platform.quality.acceptance_criteria_status',3),
        ('platform.governance.approval_status',        4)
      ) AS v(k, ord)
      JOIN attribute_definitions ad ON ad.key = v.k AND ad.scope = 'SYSTEM'
      JOIN templates t ON t.id = '0183f58a-d1d7-4723-a7fe-92303719dd43'::uuid
      ON CONFLICT (template_id, attribute_definition_id) DO NOTHING;
    `);

    // Kanban Delivery Project (88ca4501-c01b-4a1e-826c-e1f2c29bddff) — 3 attachments
    await queryRunner.query(`
      INSERT INTO template_attribute_definitions (template_id, attribute_definition_id, locked, display_order)
      SELECT t.id, ad.id, false, v.ord
      FROM (VALUES
        ('platform.agile.story_type',                  0),
        ('platform.quality.acceptance_criteria_status',1),
        ('platform.external.system_reference',         2)
      ) AS v(k, ord)
      JOIN attribute_definitions ad ON ad.key = v.k AND ad.scope = 'SYSTEM'
      JOIN templates t ON t.id = '88ca4501-c01b-4a1e-826c-e1f2c29bddff'::uuid
      ON CONFLICT (template_id, attribute_definition_id) DO NOTHING;
    `);

    // Hybrid Project (f8536ebd-79e6-4ace-b172-116331b7c5f0) — 6 attachments
    await queryRunner.query(`
      INSERT INTO template_attribute_definitions (template_id, attribute_definition_id, locked, display_order)
      SELECT t.id, ad.id, false, v.ord
      FROM (VALUES
        ('platform.agile.story_type',              0),
        ('platform.agile.business_value',          1),
        ('platform.cost.cost_center',              2),
        ('platform.risk.probability',              3),
        ('platform.risk.impact',                   4),
        ('platform.governance.approval_status',    5)
      ) AS v(k, ord)
      JOIN attribute_definitions ad ON ad.key = v.k AND ad.scope = 'SYSTEM'
      JOIN templates t ON t.id = 'f8536ebd-79e6-4ace-b172-116331b7c5f0'::uuid
      ON CONFLICT (template_id, attribute_definition_id) DO NOTHING;
    `);

    // Scrum Delivery Project (4e515c19-7d6b-4a88-a9b9-207e14d1dadc) — 6 attachments
    await queryRunner.query(`
      INSERT INTO template_attribute_definitions (template_id, attribute_definition_id, locked, display_order)
      SELECT t.id, ad.id, false, v.ord
      FROM (VALUES
        ('platform.agile.story_type',                  0),
        ('platform.agile.business_value',              1),
        ('platform.estimation.story_size_tshirt',      2),
        ('platform.agile.sprint_goal_contribution',    3),
        ('platform.quality.acceptance_criteria_status',4),
        ('platform.governance.approval_status',        5)
      ) AS v(k, ord)
      JOIN attribute_definitions ad ON ad.key = v.k AND ad.scope = 'SYSTEM'
      JOIN templates t ON t.id = '4e515c19-7d6b-4a88-a9b9-207e14d1dadc'::uuid
      ON CONFLICT (template_id, attribute_definition_id) DO NOTHING;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // template_attribute_definitions rows cascade via FK ON DELETE CASCADE.
    await queryRunner.query(
      `DELETE FROM attribute_definitions WHERE scope = 'SYSTEM' AND key LIKE 'platform.%'`,
    );
  }
}
