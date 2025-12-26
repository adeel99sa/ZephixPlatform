import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateResourceDailyLoadTable1767000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create resource_daily_load table
    await queryRunner.createTable(
      new Table({
        name: 'resource_daily_load',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'resource_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'capacity_percent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 100,
          },
          {
            name: 'hard_load_percent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'soft_load_percent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'warning_threshold',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'critical_threshold',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'hard_cap',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'classification',
            type: 'enum',
            enum: ['NONE', 'WARNING', 'CRITICAL'],
            default: "'NONE'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique constraint on organizationId, resourceId, date
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_resource_daily_load_org_resource_date"
      ON "resource_daily_load" ("organization_id", "resource_id", "date")
    `);

    // Create index for organization and date (for workspace-wide heatmap queries)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_resource_daily_load_org_date"
      ON "resource_daily_load" ("organization_id", "date")
    `);

    // Create index for organization, resource, date (for timeline queries)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_resource_daily_load_org_resource_date"
      ON "resource_daily_load" ("organization_id", "resource_id", "date")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "resource_daily_load"
      ADD CONSTRAINT "FK_resource_daily_load_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_daily_load"
      ADD CONSTRAINT "FK_resource_daily_load_resource"
      FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "resource_daily_load"
      DROP CONSTRAINT IF EXISTS "FK_resource_daily_load_resource"
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_daily_load"
      DROP CONSTRAINT IF EXISTS "FK_resource_daily_load_organization"
    `);

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_resource_daily_load_org_resource_date"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_resource_daily_load_org_date"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_resource_daily_load_org_resource_date"`,
    );

    // Drop table
    await queryRunner.dropTable('resource_daily_load', true);
  }
}
