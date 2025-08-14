import AppDataSource from '../src/data-source';

async function analyzeMigrationState() {
  try {
    await AppDataSource.initialize();
    console.log('=== DATABASE MIGRATION ANALYSIS ===\n');
    
    // Check if migrations table exists
    try {
      const migrations = await AppDataSource.query(`
        SELECT * FROM migrations 
        ORDER BY timestamp DESC
      `);
      console.log('Executed Migrations:', migrations);
    } catch (e) {
      console.log('Migrations table does not exist yet');
    }
    
    // Check current schema
    const userColumns = await AppDataSource.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('\nCurrent User Table Schema:');
    userColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check for orphaned constraints
    const constraints = await AppDataSource.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'users'
    `);
    console.log('\nUser Table Constraints:', constraints);
    
    // Check all tables
    const tables = await AppDataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\nAll Tables in Database:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
    await AppDataSource.destroy();
    console.log('\n=== ANALYSIS COMPLETE ===');
  } catch (error) {
    console.error('Analysis failed:', error.message);
    process.exit(1);
  }
}

analyzeMigrationState();
