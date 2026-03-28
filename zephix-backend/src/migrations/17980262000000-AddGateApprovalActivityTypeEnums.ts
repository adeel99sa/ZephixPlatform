import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 10: Add 5 new TaskActivityType enum values for gate approval chain events.
 */
export class AddGateApprovalActivityTypeEnums17980262000000
  implements MigrationInterface
{
  private readonly newValues = [
    'GATE_APPROVAL_STEP_ACTIVATED',
    'GATE_APPROVAL_STEP_APPROVED',
    'GATE_APPROVAL_STEP_REJECTED',
    'GATE_APPROVAL_CHAIN_COMPLETED',
    'GATE_APPROVAL_ESCALATED',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get the enum type name from the column
    const enumTypeName = await this.getEnumTypeName(queryRunner);
    if (!enumTypeName) {
      // If no enum type found, the column might use varchar — nothing to do
      return;
    }

    for (const value of this.newValues) {
      const exists = await queryRunner.query(
        `SELECT 1 FROM pg_enum WHERE enumlabel = $1 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $2)`,
        [value, enumTypeName],
      );
      if (exists.length === 0) {
        await queryRunner.query(
          `ALTER TYPE "${enumTypeName}" ADD VALUE IF NOT EXISTS '${value}'`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values directly.
    // This is a no-op for down migration safety.
  }

  private async getEnumTypeName(queryRunner: QueryRunner): Promise<string | null> {
    const result = await queryRunner.query(`
      SELECT udt_name FROM information_schema.columns
      WHERE table_name = 'task_activities' AND column_name = 'type'
    `);
    return result.length > 0 ? result[0].udt_name : null;
  }
}
