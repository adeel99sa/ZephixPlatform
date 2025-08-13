import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function checkMigrationStatus() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'zephix',
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Check if migrations table exists
    const migrationsTableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    if (migrationsTableExists[0]?.exists) {
      console.log('✅ Migrations table exists');
      
      // Check current migrations
      const migrations = await dataSource.query(`
        SELECT * FROM migrations ORDER BY timestamp DESC;
      `);
      
      console.log(`📊 Found ${migrations.length} migrations:`);
      migrations.forEach((migration: any) => {
        console.log(`  - ${migration.timestamp}: ${migration.name}`);
      });
    } else {
      console.log('⚠️  Migrations table does not exist - this is normal for fresh databases');
    }

    // Check if workflow tables exist
    const workflowTables = ['workflow_templates', 'workflow_instances', 'intake_forms', 'intake_submissions'];
    
    for (const tableName of workflowTables) {
      const tableExists = await dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      
      if (tableExists[0]?.exists) {
        console.log(`⚠️  Table ${tableName} already exists - migration may have partially run`);
      } else {
        console.log(`✅ Table ${tableName} does not exist`);
      }
    }

    // Check for any existing constraints
    const existingConstraints = await dataSource.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_name LIKE 'FK_workflow_%'
      OR tc.constraint_name LIKE 'FK_intake_%'
      ORDER BY tc.table_name, tc.constraint_name;
    `);

    if (existingConstraints.length > 0) {
      console.log(`⚠️  Found ${existingConstraints.length} existing workflow constraints:`);
      existingConstraints.forEach((constraint: any) => {
        console.log(`  - ${constraint.table_name}.${constraint.constraint_name} (${constraint.constraint_type})`);
      });
    } else {
      console.log('✅ No existing workflow constraints found');
    }

  } catch (error) {
    console.error('❌ Error checking migration status:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

checkMigrationStatus().catch(console.error);
