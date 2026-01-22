import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Sprint 3: Add project health tracking
 *
 * Adds:
 * - health enum (HEALTHY, AT_RISK, BLOCKED)
 * - behindTargetDays integer nullable
 * - healthUpdatedAt timestamp nullable
 *
 * Backfills existing projects:
 * - health = HEALTHY
 * - behindTargetDays = null
 * - healthUpdatedAt = now
 */
export class AddProjectHealthFields1767767013714 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create health enum type
    await queryRunner.query(`
      CREATE TYPE project_health AS ENUM ('HEALTHY', 'AT_RISK', 'BLOCKED');
    `);

    // 2. Add health column with default HEALTHY
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'health',
        type: 'varchar',
        length: '50',
        default: "'HEALTHY'",
        isNullable: true,
      }),
    );

    // 3. Add behindTargetDays column
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'behind_target_days',
        type: 'integer',
        isNullable: true,
      }),
    );

    // 4. Add healthUpdatedAt column
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'health_updated_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // 5. Backfill existing projects
    await queryRunner.query(`
      UPDATE projects
      SET
        health = 'HEALTHY',
        behind_target_days = NULL,
        health_updated_at = NOW()
      WHERE health IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns
    await queryRunner.dropColumn('projects', 'health_updated_at');
    await queryRunner.dropColumn('projects', 'behind_target_days');
    await queryRunner.dropColumn('projects', 'health');

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS project_health;`);
  }
}
