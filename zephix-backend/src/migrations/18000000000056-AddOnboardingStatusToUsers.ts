import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingStatusToUsers18000000000056
  implements MigrationInterface
{
  name = 'AddOnboardingStatusToUsers18000000000056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add onboarding_status column with 4-state enum stored as varchar
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "onboarding_status" varchar(20) NOT NULL DEFAULT 'not_started'
    `);

    // 2. Add audit timestamp columns
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "onboarding_dismissed_at" timestamp DEFAULT NULL
    `);

    // 3. Backfill from org-level onboarding state.
    //    For each user, check their organization's settings.onboarding JSONB.
    //    Priority: if org has workspaces → completed; if skipped → dismissed; else not_started.

    // 3a. Users whose org has at least one workspace → completed
    await queryRunner.query(`
      UPDATE "users" u
      SET "onboarding_status" = 'completed',
          "onboarding_completed_at" = NOW()
      WHERE u."organization_id" IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM "workspaces" w
          WHERE w."organization_id" = u."organization_id"
            AND w."deleted_at" IS NULL
        )
    `);

    // 3b. Users whose org has onboarding.skipped=true and NO workspaces → dismissed
    await queryRunner.query(`
      UPDATE "users" u
      SET "onboarding_status" = 'dismissed',
          "onboarding_dismissed_at" = NOW()
      WHERE u."onboarding_status" = 'not_started'
        AND u."organization_id" IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM "organizations" o
          WHERE o."id" = u."organization_id"
            AND (o."settings"->'onboarding'->>'skipped')::boolean = true
        )
    `);

    // 3c. Also honour the legacy onboarding_completed column from migration 043 (may not exist on greenfield DBs)
    const legacy = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'onboarding_completed'
      LIMIT 1
    `);
    if (Array.isArray(legacy) && legacy.length > 0) {
      await queryRunner.query(`
        UPDATE "users"
        SET "onboarding_status" = 'completed',
            "onboarding_completed_at" = COALESCE("onboarding_completed_at", NOW())
        WHERE "onboarding_completed" = true
          AND "onboarding_status" = 'not_started'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "onboarding_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "onboarding_completed_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "onboarding_dismissed_at"
    `);
  }
}
