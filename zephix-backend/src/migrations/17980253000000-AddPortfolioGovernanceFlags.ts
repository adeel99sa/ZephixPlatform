import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPortfolioGovernanceFlags17980253000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolios
        ADD COLUMN IF NOT EXISTS cost_tracking_enabled boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS baselines_enabled boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS iterations_enabled boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS change_management_enabled boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS inherited_governance_mode text NOT NULL DEFAULT 'PORTFOLIO_DEFAULTS';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolios
        DROP COLUMN IF EXISTS cost_tracking_enabled,
        DROP COLUMN IF EXISTS baselines_enabled,
        DROP COLUMN IF EXISTS iterations_enabled,
        DROP COLUMN IF EXISTS change_management_enabled,
        DROP COLUMN IF EXISTS inherited_governance_mode;
    `);
  }
}
