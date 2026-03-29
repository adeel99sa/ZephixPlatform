import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingCompletedToUsers18000000000043
  implements MigrationInterface
{
  name = 'AddOnboardingCompletedToUsers18000000000043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "onboarding_completed"
    `);
  }
}
