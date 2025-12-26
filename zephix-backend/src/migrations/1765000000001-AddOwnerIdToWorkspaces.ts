import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerIdToWorkspaces1765000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Skip if owner_id column already exists (created by bootstrap migration)
    const table = await queryRunner.getTable('workspaces');
    if (table && table.findColumnByName('owner_id')) {
      return;
    }
    // Add nullable owner_id column
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD COLUMN "owner_id" uuid NULL
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD CONSTRAINT "FK_workspaces_owner"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // Add index for owner_id lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_workspaces_owner_id" ON "workspaces" ("owner_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_workspaces_owner_id"`);
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP CONSTRAINT "FK_workspaces_owner"`,
    );
    await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "owner_id"`);
  }
}
