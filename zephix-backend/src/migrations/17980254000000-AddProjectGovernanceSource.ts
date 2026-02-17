import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectGovernanceSource17980254000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS governance_source text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
        DROP COLUMN IF EXISTS governance_source;
    `);
  }
}
