import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix user_organizations camelCase columns to be NULLABLE.
 *
 * Root cause: InitCoreSchema created columns "userId" and "organizationId"
 * as NOT NULL. UserOrganizationsSnakeCaseColumns added snake_case duplicates
 * (user_id, organization_id) but never relaxed the old camelCase columns.
 *
 * TypeORM entity maps to user_id / organization_id (snake_case), so
 * INSERT operations leave the old camelCase columns NULL, violating the
 * NOT NULL constraint.
 *
 * Fix: make camelCase columns nullable. They are deprecated; the snake_case
 * columns are the source of truth.
 */
export class FixUserOrganizationsCamelCaseNullable17980241000000
  implements MigrationInterface
{
  name = 'FixUserOrganizationsCamelCaseNullable17980241000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the camelCase columns exist before altering
    const hasUserId = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_organizations'
        AND column_name = 'userId'
      LIMIT 1
    `);
    const hasOrgId = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_organizations'
        AND column_name = 'organizationId'
      LIMIT 1
    `);

    if (hasUserId?.length) {
      await queryRunner.query(`
        ALTER TABLE user_organizations ALTER COLUMN "userId" DROP NOT NULL
      `);
    }
    if (hasOrgId?.length) {
      await queryRunner.query(`
        ALTER TABLE user_organizations ALTER COLUMN "organizationId" DROP NOT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverting would re-add NOT NULL constraint; only safe if all rows have values
    const hasUserId = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_organizations'
        AND column_name = 'userId'
      LIMIT 1
    `);
    const hasOrgId = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_organizations'
        AND column_name = 'organizationId'
      LIMIT 1
    `);

    if (hasUserId?.length) {
      // Backfill from snake_case before re-adding NOT NULL
      await queryRunner.query(`
        UPDATE user_organizations SET "userId" = user_id WHERE "userId" IS NULL
      `);
      await queryRunner.query(`
        ALTER TABLE user_organizations ALTER COLUMN "userId" SET NOT NULL
      `);
    }
    if (hasOrgId?.length) {
      await queryRunner.query(`
        UPDATE user_organizations SET "organizationId" = organization_id WHERE "organizationId" IS NULL
      `);
      await queryRunner.query(`
        ALTER TABLE user_organizations ALTER COLUMN "organizationId" SET NOT NULL
      `);
    }
  }
}
