import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillOnboardingCompletedForExistingUsers18000000000056
  implements MigrationInterface
{
  name = 'BackfillOnboardingCompletedForExistingUsers18000000000056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migration 43 added the column with DEFAULT false but the backfill
    // UPDATE was added after it had already been recorded as applied.
    // This migration retroactively sets existing users to true so the
    // frontend onboarding guard does not trap them.
    //
    // The trigger zephix_protect_demo_users references NEW.deleted_at
    // which does not exist on the users table — drop it before UPDATE,
    // then recreate it without the deleted_at reference.
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS zephix_protect_demo_users ON "users"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS zephix_protect_demo_users()`,
    );
    const result = await queryRunner.query(`
      UPDATE "users"
      SET "onboarding_completed" = true
      WHERE "onboarding_completed" = false
    `);
    // Recreate the trigger without the broken deleted_at reference
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION zephix_protect_demo_users()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'DELETE' AND OLD.email LIKE '%@demo.zephix.dev' THEN
          RAISE EXCEPTION 'Cannot delete demo users';
        END IF;
        IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
          IF OLD.email LIKE '%@demo.zephix.dev' THEN
            RAISE EXCEPTION 'Cannot change role of demo users';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER zephix_protect_demo_users
      BEFORE UPDATE OR DELETE ON "users"
      FOR EACH ROW EXECUTE FUNCTION zephix_protect_demo_users()
    `);
    console.log(
      `[Migration 56] Backfilled onboarding_completed=true for ${result?.[1] ?? '?'} existing users`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: we cannot distinguish users who were backfilled from
    // users who genuinely completed onboarding after the fix.
  }
}
