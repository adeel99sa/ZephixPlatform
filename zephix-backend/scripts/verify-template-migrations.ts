import { DataSource } from 'typeorm';
import AppDataSource from '../src/config/data-source';

async function verifyMigrations() {
  try {
    await AppDataSource.initialize();

    const templatesCount = await AppDataSource.query(
      'SELECT COUNT(*)::int as count FROM templates'
    );
    const projectTemplatesCount = await AppDataSource.query(
      'SELECT COUNT(*)::int as count, COUNT(template_id)::int as linked FROM project_templates'
    );
    const legacyCount = await AppDataSource.query(
      'SELECT COUNT(*)::int as count FROM template_blocks_legacy'
    ).catch(() => [{ count: 0 }]);
    const v1Count = await AppDataSource.query(
      'SELECT COUNT(*)::int as count FROM template_blocks'
    );

    console.log('\n=== Template Center v1 Migration Verification ===\n');
    console.log(`Templates: ${templatesCount[0].count}`);
    console.log(`Project Templates: ${projectTemplatesCount[0].count} (${projectTemplatesCount[0].linked} linked)`);
    console.log(`Template Blocks Legacy: ${legacyCount[0].count}`);
    console.log(`Template Blocks v1: ${v1Count[0].count}`);
    console.log('\n✅ Migration verification complete\n');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verifyMigrations();




