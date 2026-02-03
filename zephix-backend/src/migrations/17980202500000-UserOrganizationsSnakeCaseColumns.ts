import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds snake_case user_id and organization_id to user_organizations.
 * Backfills from existing "userId" and "organizationId" (InitialProductionSchema).
 * Required so schema verification and auth contract match production.
 */
export class UserOrganizationsSnakeCaseColumns17980202500000
  implements MigrationInterface
{
  name = 'UserOrganizationsSnakeCaseColumns17980202500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add snake_case columns if they don't exist
    await queryRunner.query(`
      ALTER TABLE user_organizations
      ADD COLUMN IF NOT EXISTS user_id uuid
    `);
    await queryRunner.query(`
      ALTER TABLE user_organizations
      ADD COLUMN IF NOT EXISTS organization_id uuid
    `);

    // Backfill from camelCase columns if they exist
    const hasUserId = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_organizations' AND column_name = 'userId'
      LIMIT 1
    `);
    const hasOrgId = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_organizations' AND column_name = 'organizationId'
      LIMIT 1
    `);
    if (hasUserId?.length) {
      await queryRunner.query(`
        UPDATE user_organizations SET user_id = "userId" WHERE user_id IS NULL
      `);
    }
    if (hasOrgId?.length) {
      await queryRunner.query(`
        UPDATE user_organizations SET organization_id = "organizationId" WHERE organization_id IS NULL
      `);
    }

    // Set NOT NULL only when no nulls remain (safe for empty table or full backfill)
    const nullUser = await queryRunner.query(
      `SELECT 1 FROM user_organizations WHERE user_id IS NULL LIMIT 1`,
    );
    const nullOrg = await queryRunner.query(
      `SELECT 1 FROM user_organizations WHERE organization_id IS NULL LIMIT 1`,
    );
    if (!nullUser?.length) {
      await queryRunner.query(`
        ALTER TABLE user_organizations ALTER COLUMN user_id SET NOT NULL
      `);
    }
    if (!nullOrg?.length) {
      await queryRunner.query(`
        ALTER TABLE user_organizations ALTER COLUMN organization_id SET NOT NULL
      `);
    }

    // Add FKs if they don't exist (avoid duplicate constraint names)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_organizations_user_id'
        ) THEN
          ALTER TABLE user_organizations
          ADD CONSTRAINT FK_user_organizations_user_id
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_organizations_organization_id'
        ) THEN
          ALTER TABLE user_organizations
          ADD CONSTRAINT FK_user_organizations_organization_id
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);

    // Indexes for common lookups (if not exist)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_user_organizations_user_id
      ON user_organizations (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_user_organizations_organization_id
      ON user_organizations (organization_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_organizations DROP CONSTRAINT IF EXISTS FK_user_organizations_user_id
    `);
    await queryRunner.query(`
      ALTER TABLE user_organizations DROP CONSTRAINT IF EXISTS FK_user_organizations_organization_id
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS IDX_user_organizations_user_id
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS IDX_user_organizations_organization_id
    `);
    await queryRunner.query(`
      ALTER TABLE user_organizations DROP COLUMN IF EXISTS user_id
    `);
    await queryRunner.query(`
      ALTER TABLE user_organizations DROP COLUMN IF EXISTS organization_id
    `);
  }
}
