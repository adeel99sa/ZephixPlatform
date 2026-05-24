import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 5.1 — Data migration: work_risks → project_artifact_items.
 *
 * For each distinct project_id in work_risks (where deleted_at IS NULL):
 *   1. INSERT one project_artifacts row (type='risk_register'), seeded with
 *      the PMBOK Risk Register custom_field_definitions.
 *   2. INSERT one project_artifact_items row per surviving work_risks row,
 *      mapped via the rules locked in Sprint 5.1 dispatch resolutions:
 *        title              → name
 *        mitigation_plan    → content.mitigation
 *        owner_user_id      → assignee_id
 *        severity           → priority (LOW→low, MEDIUM→normal,
 *                             HIGH→high, CRITICAL→urgent)
 *        status (enum)      → content.status (raw string); status_id NULL
 *                             (no status_groups table; see N1 resolution)
 *        exposure           → content.risk_score
 *        probability/impact → content.probability / content.impact (raw int)
 *        description        → content.description
 *        source, risk_type, evidence, detected_at, legacy_risk_id
 *                           → content.legacy_metadata.* (preserved for
 *                             round-trip; not surfaced in UI)
 *        notes              → does not exist on work_risks; skipped
 *
 * tenant scope: each artifact + item is stamped with work_risks'
 * organization_id and workspace_id so the new rows respect the same
 * tenancy as the source rows (no derivation from project required).
 *
 * created_at on the artifact = MIN(work_risks.created_at) for that project.
 * created_by on the artifact = first non-null work_risks.created_by for
 * that project; falls back to projects.created_by_id if all NULL.
 *
 * work_risks is NOT dropped here — it's deprecated via table COMMENT and
 * deletion is deferred to Sprint 6 (after 5.2 frontend cutover).
 */
export class MigrateWorkRisksToArtifacts18000000000182 implements MigrationInterface {
  name = 'MigrateWorkRisksToArtifacts18000000000182';

  private readonly riskRegisterFieldDefs = JSON.stringify([
    { id: 'probability', name: 'Probability', type: 'enum',
      enumValues: ['Low', 'Medium', 'High'], required: true, displayOrder: 1 },
    { id: 'impact', name: 'Impact', type: 'enum',
      enumValues: ['Low', 'Medium', 'High'], required: true, displayOrder: 2 },
    { id: 'risk_score', name: 'Risk Score', type: 'number',
      required: false, displayOrder: 3 },
    { id: 'mitigation', name: 'Mitigation Strategy', type: 'text',
      required: false, displayOrder: 4 },
    { id: 'category', name: 'Category', type: 'enum',
      enumValues: ['Technical', 'Schedule', 'Budget', 'Resource', 'Quality', 'External'],
      required: false, displayOrder: 5 },
  ]);

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create one project_artifacts row per project that has surviving work_risks.
    //    Project owner falls back to the first project creator when work_risks.created_by is NULL.
    await queryRunner.query(
      `
      INSERT INTO "project_artifacts" (
        "id", "organization_id", "workspace_id", "project_id",
        "type", "name", "description", "icon",
        "position", "template_id", "status_group_id",
        "custom_field_definitions", "created_by",
        "created_at", "updated_at"
      )
      SELECT
        gen_random_uuid()                                   AS id,
        wr.organization_id                                  AS organization_id,
        wr.workspace_id                                     AS workspace_id,
        wr.project_id                                       AS project_id,
        'risk_register'                                     AS type,
        'Risk Register'                                     AS name,
        'Migrated from legacy work_risks (Sprint 5.1)'      AS description,
        'shield-alert'                                      AS icon,
        0                                                   AS position,
        NULL                                                AS template_id,
        NULL                                                AS status_group_id,
        $1::jsonb                                           AS custom_field_definitions,
        COALESCE(
          (SELECT wr2.created_by FROM "work_risks" wr2
            WHERE wr2.project_id = wr.project_id
              AND wr2.created_by IS NOT NULL
              AND wr2.deleted_at IS NULL
            ORDER BY wr2.created_at ASC LIMIT 1),
          (SELECT p.created_by_id FROM "projects" p WHERE p.id = wr.project_id)
        )                                                   AS created_by,
        MIN(wr.created_at)                                  AS created_at,
        now()                                               AS updated_at
      FROM "work_risks" wr
      WHERE wr.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "project_artifacts" pa
          WHERE pa.project_id = wr.project_id
            AND pa.type = 'risk_register'
            AND pa.deleted_at IS NULL
        )
      GROUP BY wr.organization_id, wr.workspace_id, wr.project_id
      `,
      [this.riskRegisterFieldDefs],
    );

    // 2. Create one project_artifact_items row per surviving work_risks row.
    //    Items are linked to the artifact created above via project_id + type.
    await queryRunner.query(`
      INSERT INTO "project_artifact_items" (
        "id", "organization_id", "workspace_id", "artifact_id",
        "name", "content",
        "status_id", "assignee_id", "priority", "due_date",
        "custom_field_values", "position", "parent_item_id",
        "created_by", "created_at", "updated_at"
      )
      SELECT
        gen_random_uuid()                                   AS id,
        wr.organization_id                                  AS organization_id,
        wr.workspace_id                                     AS workspace_id,
        pa.id                                               AS artifact_id,
        wr.title                                            AS name,
        jsonb_build_object(
          'description',  wr.description,
          'mitigation',   wr.mitigation_plan,
          'status',       wr.status::text,
          'probability',  wr.probability,
          'impact',       wr.impact,
          'risk_score',   wr.exposure,
          'legacy_metadata', jsonb_build_object(
            'source',         wr.source,
            'risk_type',      wr.risk_type,
            'evidence',       wr.evidence,
            'detected_at',    wr.detected_at,
            'legacy_risk_id', wr.legacy_risk_id
          )
        )                                                   AS content,
        NULL                                                AS status_id,
        wr.owner_user_id                                    AS assignee_id,
        CASE wr.severity::text
          WHEN 'LOW' THEN 'low'
          WHEN 'MEDIUM' THEN 'normal'
          WHEN 'HIGH' THEN 'high'
          WHEN 'CRITICAL' THEN 'urgent'
          ELSE NULL
        END                                                 AS priority,
        wr.due_date::timestamptz                            AS due_date,
        '{}'::jsonb                                         AS custom_field_values,
        ROW_NUMBER() OVER (
          PARTITION BY pa.id
          ORDER BY wr.created_at ASC, wr.id ASC
        ) - 1                                               AS position,
        NULL                                                AS parent_item_id,
        COALESCE(wr.created_by, pa.created_by)              AS created_by,
        wr.created_at                                       AS created_at,
        wr.updated_at                                       AS updated_at
      FROM "work_risks" wr
      JOIN "project_artifacts" pa
        ON pa.project_id = wr.project_id
       AND pa.type = 'risk_register'
       AND pa.deleted_at IS NULL
      WHERE wr.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "project_artifact_items" pai
          WHERE pai.artifact_id = pa.id
            AND pai.content ->> 'legacy_metadata' IS NOT NULL
            AND (pai.content -> 'legacy_metadata' ->> 'legacy_risk_id') = wr.legacy_risk_id::text
        )
    `);

    // 3. Mark work_risks as deprecated. Table is retained until Sprint 6
    //    drops it (after the 5.2 frontend stops reading from it).
    await queryRunner.query(`
      COMMENT ON TABLE "work_risks" IS
      'DEPRECATED 2026-05-24 (Sprint 5.1) — migrated to project_artifact_items with type=risk_register. Drop scheduled for Sprint 6 after frontend cutover.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the data migration by deleting the artifact rows we created.
    // work_risks itself is untouched — its data was never destroyed, just copied.
    await queryRunner.query(`
      DELETE FROM "project_artifact_items"
      WHERE "artifact_id" IN (
        SELECT id FROM "project_artifacts"
        WHERE "type" = 'risk_register'
          AND "description" = 'Migrated from legacy work_risks (Sprint 5.1)'
      )
    `);
    await queryRunner.query(`
      DELETE FROM "project_artifacts"
      WHERE "type" = 'risk_register'
        AND "description" = 'Migrated from legacy work_risks (Sprint 5.1)'
    `);
    await queryRunner.query(`COMMENT ON TABLE "work_risks" IS NULL`);
  }
}
