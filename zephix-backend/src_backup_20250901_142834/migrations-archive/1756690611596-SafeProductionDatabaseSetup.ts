import { MigrationInterface, QueryRunner } from 'typeorm';

export class SafeProductionDatabaseSetup1756690611596
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all existing tables
    const tables = await queryRunner.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        `);

    const tableNames = tables.map((t) => t.tablename);
    console.log('Existing tables:', tableNames);

    // 1. SAFE TABLE RENAMING - Only rename if they exist
    const renameMappings = [
      { old: 'emailVerifications', new: 'email_verifications' },
      { old: 'refreshTokens', new: 'refresh_tokens' },
      { old: 'riskSignals', new: 'risk_signals' },
      { old: 'userDailyCapacity', new: 'user_daily_capacity' },
      { old: 'userOrganizations', new: 'user_organizations' },
      { old: 'workItems', new: 'work_items' },
    ];

    for (const mapping of renameMappings) {
      if (tableNames.includes(mapping.old)) {
        await queryRunner.query(
          `ALTER TABLE "${mapping.old}" RENAME TO ${mapping.new}`,
        );
        console.log(`Renamed ${mapping.old} to ${mapping.new}`);
      }
    }

    // 2. SAFE ALLOCATION TABLE CONSOLIDATION
    if (
      tableNames.includes('project_allocations') &&
      tableNames.includes('resource_allocations')
    ) {
      // Check if columns exist before adding
      const resourceAllocColumns = await queryRunner.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'resource_allocations' AND table_schema = 'public'
            `);
      const existingColumns = resourceAllocColumns.map((c) => c.column_name);

      // Add missing columns
      if (!existingColumns.includes('organization_id')) {
        await queryRunner.query(
          `ALTER TABLE resource_allocations ADD COLUMN organization_id UUID`,
        );
      }
      if (!existingColumns.includes('user_id')) {
        await queryRunner.query(
          `ALTER TABLE resource_allocations ADD COLUMN user_id UUID`,
        );
      }

      // Migrate data
      await queryRunner.query(`
                INSERT INTO resource_allocations (
                    organization_id, project_id, resource_id, user_id,
                    start_date, end_date, allocation_percentage, created_at
                )
                SELECT 
                    organization_id, project_id, resource_id, user_id,
                    start_date, end_date, allocation_percentage, created_at
                FROM project_allocations
                WHERE NOT EXISTS (
                    SELECT 1 FROM resource_allocations 
                    WHERE resource_allocations.id = project_allocations.id
                )
            `);

      // Drop project_allocations
      await queryRunner.query(`DROP TABLE IF EXISTS project_allocations`);
      console.log('Consolidated allocation tables');
    }

    // 3. SAFE INDEX CREATION - Check before creating
    const indexes = await queryRunner.query(`
            SELECT indexname FROM pg_indexes 
            WHERE schemaname = 'public'
        `);
    const existingIndexes = indexes.map((i) => i.indexname);

    if (!existingIndexes.includes('idx_allocations_org_resource_dates')) {
      await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS idx_allocations_org_resource_dates 
                ON resource_allocations(organization_id, resource_id, start_date, end_date)
            `);
    }

    // 4. CLEAN UP DUPLICATE COLUMNS IF THEY EXIST
    if (tableNames.includes('resource_allocations')) {
      const columns = await queryRunner.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'resource_allocations'
            `);
      const columnNames = columns.map((c) => c.column_name);

      // Remove camelCase duplicates if they exist
      if (
        columnNames.includes('organizationId') &&
        columnNames.includes('organization_id')
      ) {
        await queryRunner.query(
          `ALTER TABLE resource_allocations DROP COLUMN IF EXISTS "organizationId"`,
        );
      }
      if (columnNames.includes('userId') && columnNames.includes('user_id')) {
        await queryRunner.query(
          `ALTER TABLE resource_allocations DROP COLUMN IF EXISTS "userId"`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversal not recommended for production
    console.log('Reversal not implemented - would require data backup');
  }
}
