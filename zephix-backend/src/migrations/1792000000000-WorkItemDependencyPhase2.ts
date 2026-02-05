import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkItemDependencyPhase21792000000000
  implements MigrationInterface
{
  name = 'WorkItemDependencyPhase21792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if type column exists (from Phase 1) and rename to dependency_type
    const table = await queryRunner.getTable('work_item_dependencies');
    const hasTypeColumn = table?.findColumnByName('type');
    const hasDependencyTypeColumn = table?.findColumnByName('dependency_type');

    if (hasTypeColumn && !hasDependencyTypeColumn) {
      await queryRunner.query(`
        ALTER TABLE "work_item_dependencies"
        RENAME COLUMN "type" TO "dependency_type"
      `);
    } else if (!hasDependencyTypeColumn) {
      await queryRunner.query(`
        ALTER TABLE "work_item_dependencies"
        ADD COLUMN "dependency_type" varchar(2) NOT NULL DEFAULT 'FS'
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "work_item_dependencies"
      ADD COLUMN IF NOT EXISTS "lag_days" int NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "work_item_dependencies"
      ALTER COLUMN "project_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_work_item_dependencies_project_pred_succ"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_wid_ws_pred_succ_type"
      ON "work_item_dependencies" ("workspace_id", "predecessor_id", "successor_id", "dependency_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_wid_workspace"
      ON "work_item_dependencies" ("workspace_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_wid_predecessor"
      ON "work_item_dependencies" ("workspace_id", "predecessor_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_wid_successor"
      ON "work_item_dependencies" ("workspace_id", "successor_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wid_successor"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wid_predecessor"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wid_workspace"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_wid_ws_pred_succ_type"`);

    await queryRunner.query(`
      ALTER TABLE "work_item_dependencies"
      ALTER COLUMN "project_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "work_item_dependencies"
      DROP COLUMN IF EXISTS "lag_days"
    `);

    await queryRunner.query(`
      ALTER TABLE "work_item_dependencies"
      DROP COLUMN IF EXISTS "dependency_type"
    `);
  }
}
