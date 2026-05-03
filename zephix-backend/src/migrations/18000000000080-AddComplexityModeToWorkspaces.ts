import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AD-026 schema foundation: adds complexity_mode column to workspaces.
 *
 * Three-tier model: simple (default), standard, advanced.
 * Existing rows get 'simple' via column default. Additive + reversible.
 */
export class AddComplexityModeToWorkspaces18000000000080
  implements MigrationInterface
{
  name = 'AddComplexityModeToWorkspaces18000000000080';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create ENUM type (idempotent via EXCEPTION handler)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE workspace_complexity_mode_enum
          AS ENUM ('simple', 'standard', 'advanced');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Add column with default (existing rows get 'simple')
    await queryRunner.query(`
      ALTER TABLE "workspaces"
        ADD COLUMN IF NOT EXISTS "complexity_mode"
        workspace_complexity_mode_enum NOT NULL DEFAULT 'simple'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "complexity_mode"
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS workspace_complexity_mode_enum
    `);
  }
}
