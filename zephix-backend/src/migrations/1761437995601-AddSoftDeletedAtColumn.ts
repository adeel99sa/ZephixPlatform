import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeletedAtColumn1761437995601 implements MigrationInterface {
  name = 'AddSoftDeletedAtColumn1761437995601';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new soft_deleted_at column
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD "soft_deleted_at" TIMESTAMP`,
    );

    // Create index for the new column
    await queryRunner.query(
      `CREATE INDEX "IDX_workspaces_soft_deleted_at" ON "workspaces" ("soft_deleted_at")`,
    );

    // Drop the old deleted_at column and its index
    await queryRunner.query(`DROP INDEX "IDX_workspaces_deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP COLUMN "deleted_at"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the deleted_at column
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD "deleted_at" TIMESTAMP`,
    );

    // Create index for the deleted_at column
    await queryRunner.query(
      `CREATE INDEX "IDX_workspaces_deleted_at" ON "workspaces" ("deleted_at")`,
    );

    // Drop the soft_deleted_at column and its index
    await queryRunner.query(`DROP INDEX "IDX_workspaces_soft_deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP COLUMN "soft_deleted_at"`,
    );
  }
}
