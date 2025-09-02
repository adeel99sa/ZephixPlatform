import { MigrationInterface, QueryRunner } from 'typeorm';

export class DebugWhatExists1756693487970 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('========== DEBUG MIGRATION START ==========');

    // List all tables
    const tables = await queryRunner.query(`
            SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
        `);
    console.log('EXISTING TABLES:', tables.map((t) => t.tablename).join(', '));

    // List completed migrations
    const migrations = await queryRunner.query(`
            SELECT name FROM migrations ORDER BY timestamp
        `);
    console.log(
      'COMPLETED MIGRATIONS:',
      migrations.map((m) => m.name).join(', '),
    );

    // Check specific tables we need
    const criticalTables = [
      'resource_allocations',
      'portfolios',
      'programs',
      'risks',
    ];
    for (const table of criticalTables) {
      const exists = await queryRunner.hasTable(table);
      console.log(`Table ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
    }

    console.log('========== DEBUG MIGRATION END ==========');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nothing to reverse
  }
}
