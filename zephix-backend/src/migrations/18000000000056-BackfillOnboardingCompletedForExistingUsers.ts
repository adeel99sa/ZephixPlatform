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
    // Disable the zephix_protect_demo_users trigger first — it references
    // NEW.deleted_at which does not exist on the users table yet.
    await queryRunner.query(
      `ALTER TABLE "users" DISABLE TRIGGER ALL`,
    );
    const result = await queryRunner.query(`
      UPDATE "users"
      SET "onboarding_completed" = true
      WHERE "onboarding_completed" = false
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ENABLE TRIGGER ALL`,
    );
    console.log(
      `[Migration 56] Backfilled onboarding_completed=true for ${result?.[1] ?? '?'} existing users`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: we cannot distinguish users who were backfilled from
    // users who genuinely completed onboarding after the fix.
  }
}
