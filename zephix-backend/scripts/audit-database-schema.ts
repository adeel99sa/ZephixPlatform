import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'zephix_user',
  password: process.env.DB_PASSWORD || 'zephix_secure_password_2024',
  database: process.env.DB_DATABASE || 'zephix_auth_db',
  ssl: false,
});

async function auditDatabaseSchema() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Get all table structures
    console.log('\n📊 TABLE STRUCTURES:');
    const tables = [
      'projects', 'status_reports', 'teams', 'team_members', 
      'risks', 'project_risks', 'project_metrics', 'users', 
      'user_projects', 'stakeholder_communications', 'project_stakeholders',
      'brd', 'brd_analysis', 'generated_project_plan', 'organizations'
    ];

    for (const table of tables) {
      try {
        const result = await AppDataSource.query(`\d ${table}`);
        console.log(`\n--- ${table.toUpperCase()} ---`);
        console.log(result);
      } catch (error) {
        console.log(`\n--- ${table.toUpperCase()} ---`);
        console.log(`❌ Table does not exist: ${error.message}`);
      }
    }

    // Get all relationships/foreign keys
    console.log('\n🔗 FOREIGN KEY RELATIONSHIPS:');
    const foreignKeys = await AppDataSource.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      ORDER BY tc.table_name, kcu.column_name
    `);
    console.log(JSON.stringify(foreignKeys, null, 2));

    // Get all columns for each table
    console.log('\n📋 TABLE COLUMNS:');
    const columns = await AppDataSource.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `);
    console.log(JSON.stringify(columns, null, 2));

    // Check for specific relationship issues
    console.log('\n🔍 RELATIONSHIP AUDIT:');
    
    // Check if status_reports table has the right columns
    const statusReportColumns = await AppDataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'status_reports' 
      ORDER BY ordinal_position
    `);
    console.log('\nStatus Reports Table Columns:');
    console.log(JSON.stringify(statusReportColumns, null, 2));

    // Check foreign key constraints for status_reports
    const statusReportFKs = await AppDataSource.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'status_reports'
    `);
    console.log('\nStatus Reports Foreign Keys:');
    console.log(JSON.stringify(statusReportFKs, null, 2));

  } catch (error) {
    console.error('❌ Database audit failed:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run the audit
auditDatabaseSchema().catch(console.error);
