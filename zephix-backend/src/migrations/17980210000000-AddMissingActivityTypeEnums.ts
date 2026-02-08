import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingActivityTypeEnums17980210000000 implements MigrationInterface {
  name = 'AddMissingActivityTypeEnums17980210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check which values exist and add missing ones
    const existing = await queryRunner.query(
      `SELECT unnest(enum_range(NULL::task_activities_type_enum))::text AS val`,
    ).catch(() => []);

    const existingVals = new Set(existing.map((r: any) => r.val));

    const needed = ['TASK_DELETED', 'TASK_RESTORED'];

    for (const val of needed) {
      if (!existingVals.has(val)) {
        await queryRunner.query(
          `ALTER TYPE task_activities_type_enum ADD VALUE IF NOT EXISTS '${val}'`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from enums without recreating the type.
    // This is intentionally a no-op for safety.
  }
}
