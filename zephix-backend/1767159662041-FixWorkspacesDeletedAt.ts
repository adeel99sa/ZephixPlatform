import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Fix Workspaces deleted_at Column
 *
 * Migration 1761437995601 removed deleted_at and added soft_deleted_at,
 * but the entity expects deleted_at. This migration ensures deleted_at exists.
 */
export class FixWorkspacesDeletedAt1767159662041 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('workspaces');
        if (!table) {
            console.warn('Workspaces table does not exist, skipping migration');
            return;
        }

        const deletedAtColumn = table.findColumnByName('deleted_at');
        const softDeletedAtColumn = table.findColumnByName('soft_deleted_at');

        // If deleted_at doesn't exist, add it
        if (!deletedAtColumn) {
            console.log('Adding deleted_at column to workspaces table');
            await queryRunner.query(
                `ALTER TABLE "workspaces" ADD COLUMN "deleted_at" TIMESTAMP NULL`,
            );

            // Create index if it doesn't exist
            const indexExists = await queryRunner.query(`
                SELECT EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE tablename = 'workspaces'
                    AND indexname = 'IDX_workspaces_deleted_at'
                )
            `);

            if (!indexExists[0]?.exists) {
                console.log('Creating index for deleted_at column');
                await queryRunner.query(
                    `CREATE INDEX "IDX_workspaces_deleted_at" ON "workspaces" ("deleted_at")`,
                );
            }

            // If soft_deleted_at exists, migrate data and drop it
            if (softDeletedAtColumn) {
                console.log('Migrating data from soft_deleted_at to deleted_at');
                await queryRunner.query(`
                    UPDATE "workspaces"
                    SET "deleted_at" = "soft_deleted_at"
                    WHERE "soft_deleted_at" IS NOT NULL AND "deleted_at" IS NULL
                `);

                console.log('Dropping soft_deleted_at column and index');
                await queryRunner.query(
                    `DROP INDEX IF EXISTS "IDX_workspaces_soft_deleted_at"`,
                );
                await queryRunner.query(
                    `ALTER TABLE "workspaces" DROP COLUMN "soft_deleted_at"`,
                );
            }
        } else {
            console.log('deleted_at column already exists, skipping');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert: This migration is safe to leave as-is
        // The deleted_at column should remain for entity compatibility
        console.log('Down migration: No action needed (deleted_at should remain)');
    }

}
