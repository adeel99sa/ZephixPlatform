import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 6: Add delivery owner to projects
 * Required for ACTIVE projects
 */
export class Sprint6DeliveryOwner1772000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add delivery_owner_user_id column
    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN delivery_owner_user_id uuid NULL
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE projects
      ADD CONSTRAINT FK_projects_delivery_owner
      FOREIGN KEY (delivery_owner_user_id) REFERENCES users(id) ON DELETE SET NULL
    `);

    // Add index for lookups
    await queryRunner.query(`
      CREATE INDEX IDX_projects_delivery_owner_user_id
      ON projects(delivery_owner_user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS IDX_projects_delivery_owner_user_id
    `);

    await queryRunner.query(`
      ALTER TABLE projects
      DROP CONSTRAINT IF EXISTS FK_projects_delivery_owner
    `);

    await queryRunner.query(`
      ALTER TABLE projects
      DROP COLUMN IF EXISTS delivery_owner_user_id
    `);
  }
}
