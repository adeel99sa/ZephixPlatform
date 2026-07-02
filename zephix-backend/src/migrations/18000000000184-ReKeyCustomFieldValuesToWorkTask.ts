import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReKeyCustomFieldValuesToWorkTask18000000000184
  implements MigrationInterface
{
  name = 'ReKeyCustomFieldValuesToWorkTask18000000000184';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old unique index before renaming the column
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_custom_field_values_work_item_field"`,
    );

    // Rename workItemId → work_task_id
    await queryRunner.query(
      `ALTER TABLE "custom_field_values" RENAME COLUMN "workItemId" TO "work_task_id"`,
    );

    // Add FK: work_task_id → work_tasks(id) ON DELETE CASCADE
    await queryRunner.query(
      `ALTER TABLE "custom_field_values"
       ADD CONSTRAINT "FK_custom_field_values_work_task_id"
       FOREIGN KEY ("work_task_id")
       REFERENCES "work_tasks"("id")
       ON DELETE CASCADE`,
    );

    // Recreate unique index on the renamed column
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_custom_field_values_work_task_field"
       ON "custom_field_values" ("work_task_id", "fieldDefinitionId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_custom_field_values_work_task_field"`,
    );

    // Drop the FK
    await queryRunner.query(
      `ALTER TABLE "custom_field_values"
       DROP CONSTRAINT IF EXISTS "FK_custom_field_values_work_task_id"`,
    );

    // Rename work_task_id → workItemId
    await queryRunner.query(
      `ALTER TABLE "custom_field_values" RENAME COLUMN "work_task_id" TO "workItemId"`,
    );

    // Restore the old unique index
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_custom_field_values_work_item_field"
       ON "custom_field_values" ("workItemId", "fieldDefinitionId")`,
    );
  }
}
