import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PR 2A: Risk model canonicalization foundation.
 *
 * Adds traceability metadata to the workspace-aware work_risks table and
 * backfills rows from the legacy risks table when a safe project->workspace
 * mapping exists. This migration is intentionally additive and non-destructive:
 * legacy risks rows are never modified or deleted.
 */
export class AddRiskCanonicalizationMetadata18000000000074
  implements MigrationInterface
{
  name = 'AddRiskCanonicalizationMetadata18000000000074';
  transaction = true;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "work_risks"
        ADD COLUMN IF NOT EXISTS "source" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "risk_type" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "evidence" JSONB,
        ADD COLUMN IF NOT EXISTS "detected_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "legacy_risk_id" UUID;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_work_risks_legacy_risk_id"
        ON "work_risks" ("legacy_risk_id")
        WHERE "legacy_risk_id" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_risks_source"
        ON "work_risks" ("source")
        WHERE "source" IS NOT NULL;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        pre_risks_count INTEGER;
        pre_work_risks_count INTEGER;
        post_risks_count INTEGER;
        post_work_risks_count INTEGER;
        inserted_count INTEGER;
        migrated_count INTEGER;
        unmigratable_count INTEGER;
        migrated_without_workspace_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO pre_risks_count FROM "risks";
        SELECT COUNT(*) INTO pre_work_risks_count FROM "work_risks";

        SELECT COUNT(*) INTO unmigratable_count
        FROM "risks" r
        LEFT JOIN "projects" p ON p."id"::text = r."project_id"::text
        WHERE p."id" IS NULL OR p."workspace_id" IS NULL;

        RAISE NOTICE 'Risk canonicalization pre-check: risks=%, work_risks=%, unmigratable=%',
          pre_risks_count, pre_work_risks_count, unmigratable_count;

        WITH inserted AS (
          INSERT INTO "work_risks" (
            "id",
            "organization_id",
            "workspace_id",
            "project_id",
            "title",
            "description",
            "severity",
            "status",
            "probability",
            "impact",
            "mitigation_plan",
            "source",
            "risk_type",
            "evidence",
            "detected_at",
            "legacy_risk_id",
            "created_at",
            "updated_at",
            "created_by"
          )
          SELECT
            uuid_generate_v4() AS "id",
            p."organization_id" AS "organization_id",
            p."workspace_id" AS "workspace_id",
            p."id" AS "project_id",
            LEFT(COALESCE(NULLIF(r."title", ''), 'Untitled Risk'), 300) AS "title",
            COALESCE(r."description", '') AS "description",
            CASE UPPER(COALESCE(r."severity", 'MEDIUM'))
              WHEN 'LOW' THEN 'LOW'::"work_risks_severity_enum"
              WHEN 'MEDIUM' THEN 'MEDIUM'::"work_risks_severity_enum"
              WHEN 'HIGH' THEN 'HIGH'::"work_risks_severity_enum"
              WHEN 'CRITICAL' THEN 'CRITICAL'::"work_risks_severity_enum"
              ELSE 'MEDIUM'::"work_risks_severity_enum"
            END AS "severity",
            CASE UPPER(COALESCE(r."status", 'OPEN'))
              WHEN 'OPEN' THEN 'OPEN'::"work_risks_status_enum"
              WHEN 'CLOSED' THEN 'CLOSED'::"work_risks_status_enum"
              WHEN 'MITIGATED' THEN 'MITIGATED'::"work_risks_status_enum"
              WHEN 'ACCEPTED' THEN 'ACCEPTED'::"work_risks_status_enum"
              WHEN 'ACTIVE' THEN 'OPEN'::"work_risks_status_enum"
              WHEN 'RESOLVED' THEN 'CLOSED'::"work_risks_status_enum"
              ELSE 'OPEN'::"work_risks_status_enum"
            END AS "status",
            3 AS "probability",
            3 AS "impact",
            CASE
              WHEN r."mitigation" IS NOT NULL THEN r."mitigation"::text
              ELSE NULL
            END AS "mitigation_plan",
            LEFT(COALESCE(NULLIF(r."source", ''), 'legacy_migration'), 50) AS "source",
            LEFT(r."type", 50) AS "risk_type",
            r."evidence" AS "evidence",
            COALESCE(r."detected_at", r."created_at")::timestamptz AS "detected_at",
            r."id" AS "legacy_risk_id",
            r."created_at" AS "created_at",
            r."updated_at" AS "updated_at",
            NULL::uuid AS "created_by"
          FROM "risks" r
          JOIN "projects" p ON p."id"::text = r."project_id"::text
          WHERE p."workspace_id" IS NOT NULL
            AND p."organization_id"::text = r."organization_id"::text
            AND NOT EXISTS (
              SELECT 1
              FROM "work_risks" wr
              WHERE wr."legacy_risk_id" = r."id"
            )
          RETURNING 1
        )
        SELECT COUNT(*) INTO inserted_count FROM inserted;

        SELECT COUNT(*) INTO post_risks_count FROM "risks";
        SELECT COUNT(*) INTO post_work_risks_count FROM "work_risks";
        SELECT COUNT(*) INTO migrated_count
        FROM "work_risks"
        WHERE "legacy_risk_id" IS NOT NULL;

        SELECT COUNT(*) INTO migrated_without_workspace_count
        FROM "work_risks"
        WHERE "legacy_risk_id" IS NOT NULL
          AND "workspace_id" IS NULL;

        RAISE NOTICE 'Risk canonicalization post-check: risks=%, work_risks=%, inserted=%, migrated_with_legacy_id=%',
          post_risks_count, post_work_risks_count, inserted_count, migrated_count;

        IF post_risks_count != pre_risks_count THEN
          RAISE EXCEPTION 'Risk canonicalization failed: legacy risks count changed from % to %',
            pre_risks_count, post_risks_count;
        END IF;

        IF migrated_without_workspace_count != 0 THEN
          RAISE EXCEPTION 'Risk canonicalization failed: % migrated rows have no workspace_id',
            migrated_without_workspace_count;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "work_risks"
      WHERE "legacy_risk_id" IS NOT NULL;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_risks_source";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_risks_legacy_risk_id";`,
    );
    await queryRunner.query(`
      ALTER TABLE "work_risks"
        DROP COLUMN IF EXISTS "legacy_risk_id",
        DROP COLUMN IF EXISTS "detected_at",
        DROP COLUMN IF EXISTS "evidence",
        DROP COLUMN IF EXISTS "risk_type",
        DROP COLUMN IF EXISTS "source";
    `);
  }
}
