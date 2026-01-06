import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInternalManagedToOrganizations1768000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('organizations');
    const hasColumn = table?.findColumnByName('internal_managed');

    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE organizations
        ADD COLUMN internal_managed BOOLEAN NOT NULL DEFAULT false
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organizations
      DROP COLUMN IF EXISTS internal_managed
    `);
  }
}

