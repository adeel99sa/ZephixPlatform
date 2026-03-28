"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixWorkspacesDeletedAt1767159662041 = void 0;
class FixWorkspacesDeletedAt1767159662041 {
    async up(queryRunner) {
        const table = await queryRunner.getTable('workspaces');
        if (!table) {
            console.warn('Workspaces table does not exist, skipping migration');
            return;
        }
        const deletedAtColumn = table.findColumnByName('deleted_at');
        const softDeletedAtColumn = table.findColumnByName('soft_deleted_at');
        if (!deletedAtColumn) {
            console.log('Adding deleted_at column to workspaces table');
            await queryRunner.query(`ALTER TABLE "workspaces" ADD COLUMN "deleted_at" TIMESTAMP NULL`);
            const indexExists = await queryRunner.query(`
                SELECT EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE tablename = 'workspaces'
                    AND indexname = 'IDX_workspaces_deleted_at'
                )
            `);
            if (!indexExists[0]?.exists) {
                console.log('Creating index for deleted_at column');
                await queryRunner.query(`CREATE INDEX "IDX_workspaces_deleted_at" ON "workspaces" ("deleted_at")`);
            }
            if (softDeletedAtColumn) {
                console.log('Migrating data from soft_deleted_at to deleted_at');
                await queryRunner.query(`
                    UPDATE "workspaces"
                    SET "deleted_at" = "soft_deleted_at"
                    WHERE "soft_deleted_at" IS NOT NULL AND "deleted_at" IS NULL
                `);
                console.log('Dropping soft_deleted_at column and index');
                await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspaces_soft_deleted_at"`);
                await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "soft_deleted_at"`);
            }
        }
        else {
            console.log('deleted_at column already exists, skipping');
        }
    }
    async down(queryRunner) {
        console.log('Down migration: No action needed (deleted_at should remain)');
    }
}
exports.FixWorkspacesDeletedAt1767159662041 = FixWorkspacesDeletedAt1767159662041;
